package vn.weconex.aptis.platform.importexport;

import java.io.ByteArrayInputStream;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Set;

import lombok.extern.slf4j.Slf4j;
import org.apache.poi.ss.usermodel.Cell;
import org.apache.poi.ss.usermodel.CellType;
import org.apache.poi.ss.usermodel.Row;
import org.apache.poi.ss.usermodel.Sheet;
import org.apache.poi.ss.usermodel.Workbook;
import org.apache.poi.xssf.usermodel.XSSFWorkbook;
import org.springframework.stereotype.Component;

/**
 * Đọc file Excel import câu hỏi.
 *
 * <p>Định dạng: một dòng = một câu hỏi. Cột theo tên ở dòng tiêu đề, không theo
 * vị trí — thêm cột mới không làm vỡ file cũ.
 *
 * <pre>
 * code | part_code | component_code | title | difficulty | access_level |
 * instructions | prompt | task_type | option_a..option_h |
 * correct_option | explanation | topic_code |
 * left_a..left_h | correct_matches | correct_order | accepted_answers |
 * case_sensitive | partial_credit
 * </pre>
 *
 * <p>Cột {@code task_type} quyết định cách đọc đáp án; bỏ trống thì mặc định
 * SINGLE_CHOICE nên file cũ vẫn chạy đúng:
 *
 * <table>
 *   <tr><td>SINGLE_CHOICE / GAP_FILL_CHOICE</td><td>{@code correct_option} = một mã phương án</td></tr>
 *   <tr><td>MULTIPLE_CHOICE</td><td>{@code correct_option} = nhiều mã, phân tách dấu phẩy</td></tr>
 *   <tr><td>MATCHING / SPEAKER_MATCHING / HEADING_MATCHING</td><td>{@code correct_matches} = {@code A=B, C=D}, vế trái ở {@code left_*}</td></tr>
 *   <tr><td>SENTENCE_ORDERING</td><td>{@code correct_order} = {@code C,A,B}</td></tr>
 *   <tr><td>SHORT_TEXT</td><td>{@code accepted_answers} = các đáp án chấp nhận, phân tách {@code |}</td></tr>
 * </table>
 *
 * <p>Dạng tự luận (LONG_TEXT, AUDIO_RECORDING) không import được: chấm bằng
 * rubric chứ không có answer key, phải soạn qua admin API.
 *
 * <p>Nhiều dòng cùng {@code code} được gộp thành một bộ câu hỏi nhiều câu.
 */
@Slf4j
@Component
public class QuestionSetExcelParser {

    /**
     * Tên cột bắt buộc. {@code correct_option} không nằm ở đây vì chỉ dạng chọn
     * đáp án mới dùng — kiểm tra theo từng dạng trong {@link #validate}.
     */
    private static final List<String> REQUIRED_COLUMNS = List.of(
            "code", "part_code", "component_code", "prompt");

    /** Dạng bài import được, ánh xạ sang cách đọc đáp án. */
    private static final Map<String, AnswerFormat> SUPPORTED_TASK_TYPES = Map.of(
            "SINGLE_CHOICE", AnswerFormat.SINGLE_OPTION,
            "GAP_FILL_CHOICE", AnswerFormat.SINGLE_OPTION,
            "MULTIPLE_CHOICE", AnswerFormat.MULTIPLE_OPTIONS,
            "MATCHING", AnswerFormat.MATCHES,
            "SPEAKER_MATCHING", AnswerFormat.MATCHES,
            "HEADING_MATCHING", AnswerFormat.MATCHES,
            "SENTENCE_ORDERING", AnswerFormat.ORDER,
            "SHORT_TEXT", AnswerFormat.TEXT);

    /** Mã phương án dùng chữ cái, tối đa 8 lựa chọn một câu. */
    private static final List<String> OPTION_LETTERS =
            List.of("a", "b", "c", "d", "e", "f", "g", "h");

    /** Cách đọc đáp án, suy ra từ task_type. */
    public enum AnswerFormat {
        SINGLE_OPTION,
        MULTIPLE_OPTIONS,
        MATCHES,
        ORDER,
        TEXT
    }

    /**
     * @param rowNumber số dòng trong Excel (1-based, tính cả tiêu đề) để báo lỗi
     *     đúng chỗ cho người dùng
     * @param leftItems vế trái của câu nối cặp; rỗng với các dạng khác
     * @param correctMatches cặp nối đúng: mã vế trái -> mã vế phải
     */
    public record ParsedRow(
            int rowNumber,
            String code,
            String partCode,
            String componentCode,
            String title,
            Integer difficulty,
            String accessLevel,
            String instructions,
            String prompt,
            String taskType,
            AnswerFormat answerFormat,
            Map<String, String> options,
            Map<String, String> leftItems,
            String correctOption,
            List<String> correctOptions,
            Map<String, String> correctMatches,
            List<String> correctOrder,
            List<String> acceptedAnswers,
            boolean caseSensitive,
            boolean partialCredit,
            String explanation,
            String topicCode) {
    }

    public record ParseResult(List<ParsedRow> rows, List<String> errors) {
    }

    public ParseResult parse(byte[] content) {
        List<ParsedRow> rows = new ArrayList<>();
        List<String> errors = new ArrayList<>();

        try (Workbook workbook = new XSSFWorkbook(new ByteArrayInputStream(content))) {
            Sheet sheet = workbook.getSheetAt(0);
            if (sheet == null || sheet.getLastRowNum() < 1) {
                errors.add("File không có dữ liệu");
                return new ParseResult(rows, errors);
            }

            Map<String, Integer> columns = readHeader(sheet.getRow(0));
            List<String> missing = REQUIRED_COLUMNS.stream()
                    .filter(name -> !columns.containsKey(name))
                    .toList();

            if (!missing.isEmpty()) {
                errors.add("Thiếu cột bắt buộc: " + String.join(", ", missing));
                return new ParseResult(rows, errors);
            }

            for (int index = 1; index <= sheet.getLastRowNum(); index++) {
                Row row = sheet.getRow(index);
                if (row == null || isBlankRow(row, columns)) {
                    continue;
                }

                int rowNumber = index + 1;
                try {
                    ParsedRow parsed = readRow(row, columns, rowNumber);
                    List<String> rowErrors = validate(parsed);

                    if (rowErrors.isEmpty()) {
                        rows.add(parsed);
                    } else {
                        rowErrors.forEach(error ->
                                errors.add("Dòng " + rowNumber + ": " + error));
                    }
                } catch (Exception ex) {
                    errors.add("Dòng " + rowNumber + ": không đọc được (" + ex.getMessage() + ")");
                }
            }

        } catch (Exception ex) {
            log.warn("Không đọc được file Excel: {}", ex.getMessage());
            errors.add("Không đọc được file Excel: " + ex.getMessage());
        }

        return new ParseResult(rows, errors);
    }

    // -----------------------------------------------------------------

    private static Map<String, Integer> readHeader(Row header) {
        Map<String, Integer> columns = new LinkedHashMap<>();
        if (header == null) {
            return columns;
        }

        for (int index = 0; index < header.getLastCellNum(); index++) {
            String name = readString(header.getCell(index));
            if (name != null && !name.isBlank()) {
                // Chuẩn hóa: bỏ khoảng trắng, hạ chữ thường để người soạn file
                // không phải khớp chính xác
                columns.put(name.strip().toLowerCase().replace(' ', '_'), index);
            }
        }
        return columns;
    }

    private static ParsedRow readRow(Row row, Map<String, Integer> columns, int rowNumber) {
        Map<String, String> options = readLettered(row, columns, "option_");
        Map<String, String> leftItems = readLettered(row, columns, "left_");

        // Bỏ trống task_type = SINGLE_CHOICE: file soạn theo mẫu cũ vẫn chạy
        String taskType = upperOrNull(cell(row, columns, "task_type"));
        if (taskType == null) {
            taskType = "SINGLE_CHOICE";
        }
        AnswerFormat format = SUPPORTED_TASK_TYPES.get(taskType);

        String correctOption = upperOrNull(cell(row, columns, "correct_option"));

        return new ParsedRow(
                rowNumber,
                trimOrNull(cell(row, columns, "code")),
                trimOrNull(cell(row, columns, "part_code")),
                trimOrNull(cell(row, columns, "component_code")),
                trimOrNull(cell(row, columns, "title")),
                parseInt(cell(row, columns, "difficulty")),
                upperOrNull(cell(row, columns, "access_level")),
                trimOrNull(cell(row, columns, "instructions")),
                trimOrNull(cell(row, columns, "prompt")),
                taskType,
                format,
                options,
                leftItems,
                correctOption,
                splitList(correctOption, ","),
                parseMatches(cell(row, columns, "correct_matches")),
                splitList(upperOrNull(cell(row, columns, "correct_order")), ","),
                // Đáp án tự do có thể chứa dấu phẩy ("1,000") nên tách bằng '|'
                splitList(cell(row, columns, "accepted_answers"), "\\|"),
                parseBoolean(cell(row, columns, "case_sensitive")),
                parseBoolean(cell(row, columns, "partial_credit")),
                trimOrNull(cell(row, columns, "explanation")),
                trimOrNull(cell(row, columns, "topic_code")));
    }

    private static Map<String, String> readLettered(
            Row row, Map<String, Integer> columns, String prefix) {

        Map<String, String> values = new LinkedHashMap<>();
        for (String letter : OPTION_LETTERS) {
            String value = cell(row, columns, prefix + letter);
            if (value != null && !value.isBlank()) {
                values.put(letter.toUpperCase(), value.strip());
            }
        }
        return values;
    }

    /** Đọc {@code "A=2, B=1"} thành map. Cặp sai cú pháp bị bỏ, validate báo lỗi. */
    private static Map<String, String> parseMatches(String value) {
        Map<String, String> matches = new LinkedHashMap<>();
        if (isBlank(value)) {
            return matches;
        }

        for (String pair : value.split(",")) {
            String[] parts = pair.split("=", 2);
            if (parts.length == 2 && !parts[0].isBlank() && !parts[1].isBlank()) {
                matches.put(parts[0].strip().toUpperCase(), parts[1].strip().toUpperCase());
            }
        }
        return matches;
    }

    private static List<String> splitList(String value, String separator) {
        if (isBlank(value)) {
            return List.of();
        }
        return java.util.Arrays.stream(value.split(separator))
                .map(String::strip)
                .filter(part -> !part.isEmpty())
                .toList();
    }

    private static boolean parseBoolean(String value) {
        if (isBlank(value)) {
            return false;
        }
        String normalized = value.strip().toLowerCase();
        return normalized.equals("true") || normalized.equals("1")
                || normalized.equals("yes") || normalized.equals("x")
                || normalized.equals("có");
    }

    /**
     * Kiểm tra ở mức dòng. Kiểm tra tham chiếu (part_code có tồn tại không) để
     * dành cho importer vì cần truy vấn DB.
     */
    private static List<String> validate(ParsedRow row) {
        List<String> errors = new ArrayList<>();

        if (isBlank(row.code())) {
            errors.add("thiếu code");
        }
        if (isBlank(row.partCode())) {
            errors.add("thiếu part_code");
        }
        if (isBlank(row.componentCode())) {
            errors.add("thiếu component_code");
        }
        if (isBlank(row.prompt())) {
            errors.add("thiếu prompt");
        }
        if (row.answerFormat() == null) {
            errors.add("task_type '" + row.taskType() + "' không import được (chỉ hỗ trợ "
                    + String.join(", ", SUPPORTED_TASK_TYPES.keySet().stream().sorted().toList())
                    + ")");
        } else {
            errors.addAll(validateAnswer(row));
        }
        if (row.difficulty() != null && (row.difficulty() < 1 || row.difficulty() > 5)) {
            errors.add("difficulty phải trong khoảng 1..5");
        }
        if (row.accessLevel() != null
                && !List.of("FREE", "PREMIUM").contains(row.accessLevel())) {
            errors.add("access_level phải là FREE hoặc PREMIUM");
        }

        return errors;
    }

    /**
     * Kiểm tra đáp án theo từng dạng. Mọi mã đáp án phải trỏ tới phương án có
     * thật — answer key trỏ sai thì học viên làm đúng vẫn bị 0 điểm, mà lỗi này
     * chỉ lộ ra sau khi đã publish.
     */
    private static List<String> validateAnswer(ParsedRow row) {
        List<String> errors = new ArrayList<>();

        switch (row.answerFormat()) {
            case SINGLE_OPTION -> {
                if (row.options().size() < 2) {
                    errors.add("cần ít nhất 2 phương án (option_a, option_b…)");
                }
                if (isBlank(row.correctOption())) {
                    errors.add("thiếu correct_option");
                } else if (!row.options().containsKey(row.correctOption())) {
                    errors.add("correct_option '" + row.correctOption()
                            + "' không khớp phương án nào");
                }
            }
            case MULTIPLE_OPTIONS -> {
                if (row.options().size() < 2) {
                    errors.add("cần ít nhất 2 phương án (option_a, option_b…)");
                }
                if (row.correctOptions().isEmpty()) {
                    errors.add("thiếu correct_option (nhiều đáp án phân tách dấu phẩy)");
                }
                row.correctOptions().stream()
                        .filter(id -> !row.options().containsKey(id))
                        .forEach(id -> errors.add(
                                "correct_option '" + id + "' không khớp phương án nào"));
            }
            case MATCHES -> {
                if (row.leftItems().isEmpty()) {
                    errors.add("thiếu vế trái (left_a, left_b…)");
                }
                if (row.options().isEmpty()) {
                    errors.add("thiếu vế phải (option_a, option_b…)");
                }
                if (row.correctMatches().isEmpty()) {
                    errors.add("thiếu correct_matches (dạng 'A=B, C=D')");
                }
                row.correctMatches().forEach((left, right) -> {
                    if (!row.leftItems().containsKey(left)) {
                        errors.add("correct_matches trỏ tới vế trái '" + left + "' không có");
                    }
                    if (!row.options().containsKey(right)) {
                        errors.add("correct_matches trỏ tới vế phải '" + right + "' không có");
                    }
                });
                // Thiếu cặp thì phần còn lại không bao giờ được điểm
                if (!row.leftItems().isEmpty()
                        && row.correctMatches().size() < row.leftItems().size()) {
                    errors.add("correct_matches thiếu cặp cho một số vế trái");
                }
            }
            case ORDER -> {
                if (row.options().size() < 2) {
                    errors.add("cần ít nhất 2 câu để sắp xếp (option_a, option_b…)");
                }
                if (row.correctOrder().isEmpty()) {
                    errors.add("thiếu correct_order (dạng 'C,A,B')");
                }
                row.correctOrder().stream()
                        .filter(id -> !row.options().containsKey(id))
                        .forEach(id -> errors.add(
                                "correct_order chứa '" + id + "' không khớp phương án nào"));

                if (!row.correctOrder().isEmpty()
                        && row.correctOrder().size() != row.options().size()) {
                    errors.add("correct_order phải liệt kê đủ " + row.options().size() + " câu");
                }
                if (row.correctOrder().size() != Set.copyOf(row.correctOrder()).size()) {
                    errors.add("correct_order có mã lặp lại");
                }
            }
            case TEXT -> {
                if (row.acceptedAnswers().isEmpty()) {
                    errors.add("thiếu accepted_answers (phân tách bằng dấu |)");
                }
            }
        }

        return errors;
    }

    private static boolean isBlankRow(Row row, Map<String, Integer> columns) {
        return isBlank(cell(row, columns, "code")) && isBlank(cell(row, columns, "prompt"));
    }

    private static String cell(Row row, Map<String, Integer> columns, String columnName) {
        Integer index = columns.get(columnName);
        return index == null ? null : readString(row.getCell(index));
    }

    /**
     * Số trong Excel đọc ra dạng double (1.0), phải bỏ phần thập phân để
     * difficulty = "1" chứ không phải "1.0".
     */
    private static String readString(Cell cell) {
        if (cell == null) {
            return null;
        }
        return switch (cell.getCellType()) {
            case STRING -> cell.getStringCellValue();
            case NUMERIC -> {
                double value = cell.getNumericCellValue();
                yield value == Math.floor(value)
                        ? String.valueOf((long) value)
                        : String.valueOf(value);
            }
            case BOOLEAN -> String.valueOf(cell.getBooleanCellValue());
            case FORMULA -> readFormula(cell);
            default -> null;
        };
    }

    private static String readFormula(Cell cell) {
        try {
            return cell.getCachedFormulaResultType() == CellType.NUMERIC
                    ? String.valueOf((long) cell.getNumericCellValue())
                    : cell.getStringCellValue();
        } catch (Exception ex) {
            return null;
        }
    }

    private static Integer parseInt(String value) {
        if (isBlank(value)) {
            return null;
        }
        try {
            return Integer.valueOf(value.strip());
        } catch (NumberFormatException ex) {
            return null;
        }
    }

    private static String trimOrNull(String value) {
        return isBlank(value) ? null : value.strip();
    }

    private static String upperOrNull(String value) {
        return isBlank(value) ? null : value.strip().toUpperCase();
    }

    private static boolean isBlank(String value) {
        return value == null || value.isBlank();
    }
}
