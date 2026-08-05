package vn.weconex.aptis.platform.importexport;

import java.io.ByteArrayOutputStream;
import java.util.List;
import java.util.Map;

import org.apache.poi.ss.usermodel.Row;
import org.apache.poi.ss.usermodel.Sheet;
import org.apache.poi.xssf.usermodel.XSSFWorkbook;
import org.junit.jupiter.api.Test;

import static org.assertj.core.api.Assertions.assertThat;

/**
 * Import sai answer key là lỗi đắt: học viên trả lời đúng vẫn bị 0 điểm, và chỉ
 * lộ ra sau khi bộ câu hỏi đã publish. Nên parser phải bắt được ở khâu import.
 */
class QuestionSetExcelParserTest {

    private static final List<String> HEADER = List.of(
            "code", "part_code", "component_code", "prompt", "task_type",
            "option_a", "option_b", "option_c", "option_d",
            "left_a", "left_b",
            "correct_option", "correct_matches", "correct_order",
            "accepted_answers", "case_sensitive", "partial_credit",
            "difficulty", "access_level");

    private final QuestionSetExcelParser parser = new QuestionSetExcelParser();

    /** File soạn theo mẫu cũ không có cột task_type vẫn phải import được. */
    @Test
    void treatsMissingTaskTypeAsSingleChoice() {
        var result = parse(row(Map.of(
                "code", "S1", "part_code", "R1", "component_code", "READING",
                "prompt", "Chọn từ đúng", "option_a", "go", "option_b", "goes",
                "correct_option", "B")));

        assertThat(result.errors()).isEmpty();
        assertThat(result.rows()).singleElement().satisfies(row -> {
            assertThat(row.taskType()).isEqualTo("SINGLE_CHOICE");
            assertThat(row.answerFormat())
                    .isEqualTo(QuestionSetExcelParser.AnswerFormat.SINGLE_OPTION);
            assertThat(row.correctOption()).isEqualTo("B");
        });
    }

    @Test
    void readsMultipleChoiceAnswers() {
        var result = parse(row(Map.of(
                "code", "M1", "part_code", "R1", "component_code", "READING",
                "prompt", "Chọn các câu đúng", "task_type", "MULTIPLE_CHOICE",
                "option_a", "một", "option_b", "hai", "option_c", "ba",
                "correct_option", "A, C")));

        assertThat(result.errors()).isEmpty();
        assertThat(result.rows()).singleElement().satisfies(row ->
                assertThat(row.correctOptions()).containsExactly("A", "C"));
    }

    @Test
    void readsMatchingPairs() {
        var result = parse(row(Map.of(
                "code", "MT1", "part_code", "R3", "component_code", "READING",
                "prompt", "Nối người nói với ý kiến", "task_type", "MATCHING",
                "left_a", "An", "left_b", "Bình",
                "option_a", "Thích thể thao", "option_b", "Thích âm nhạc",
                "correct_matches", "A=B, B=A")));

        assertThat(result.errors()).isEmpty();
        assertThat(result.rows()).singleElement().satisfies(row ->
                assertThat(row.correctMatches()).containsExactly(
                        Map.entry("A", "B"), Map.entry("B", "A")));
    }

    @Test
    void readsSentenceOrdering() {
        var result = parse(row(Map.of(
                "code", "O1", "part_code", "R2", "component_code", "READING",
                "prompt", "Sắp xếp câu", "task_type", "SENTENCE_ORDERING",
                "option_a", "Sau đó", "option_b", "Đầu tiên", "option_c", "Cuối cùng",
                "correct_order", "B,A,C")));

        assertThat(result.errors()).isEmpty();
        assertThat(result.rows()).singleElement().satisfies(row ->
                assertThat(row.correctOrder()).containsExactly("B", "A", "C"));
    }

    /** Đáp án tự do hay chứa dấu phẩy ("1,000") nên phải tách bằng '|'. */
    @Test
    void splitsAcceptedAnswersOnPipeNotComma() {
        var result = parse(row(Map.of(
                "code", "T1", "part_code", "L1", "component_code", "LISTENING",
                "prompt", "Nghe và viết số", "task_type", "SHORT_TEXT",
                "accepted_answers", "1,000 | one thousand",
                "case_sensitive", "false")));

        assertThat(result.errors()).isEmpty();
        assertThat(result.rows()).singleElement().satisfies(row -> {
            assertThat(row.acceptedAnswers()).containsExactly("1,000", "one thousand");
            assertThat(row.caseSensitive()).isFalse();
        });
    }

    // ---------- Các trường hợp phải báo lỗi ----------

    @Test
    void rejectsMultipleChoiceAnswerPointingAtMissingOption() {
        var result = parse(row(Map.of(
                "code", "M2", "part_code", "R1", "component_code", "READING",
                "prompt", "Chọn các câu đúng", "task_type", "MULTIPLE_CHOICE",
                "option_a", "một", "option_b", "hai",
                "correct_option", "A,D")));

        assertThat(result.rows()).isEmpty();
        assertThat(result.errors()).anySatisfy(error ->
                assertThat(error).contains("'D'").contains("không khớp phương án nào"));
    }

    @Test
    void rejectsMatchingWithLeftItemMissingAPair() {
        var result = parse(row(Map.of(
                "code", "MT2", "part_code", "R3", "component_code", "READING",
                "prompt", "Nối", "task_type", "MATCHING",
                "left_a", "An", "left_b", "Bình",
                "option_a", "X", "option_b", "Y",
                "correct_matches", "A=X")));

        assertThat(result.rows()).isEmpty();
        // "A=X" sai vì X không phải mã phương án, và thiếu cặp cho vế trái B
        assertThat(result.errors()).isNotEmpty();
    }

    @Test
    void rejectsOrderingThatDoesNotListEveryOption() {
        var result = parse(row(Map.of(
                "code", "O2", "part_code", "R2", "component_code", "READING",
                "prompt", "Sắp xếp", "task_type", "SENTENCE_ORDERING",
                "option_a", "a", "option_b", "b", "option_c", "c",
                "correct_order", "A,B")));

        assertThat(result.rows()).isEmpty();
        assertThat(result.errors()).anySatisfy(error ->
                assertThat(error).contains("đủ 3"));
    }

    @Test
    void rejectsOrderingWithDuplicatedOption() {
        var result = parse(row(Map.of(
                "code", "O3", "part_code", "R2", "component_code", "READING",
                "prompt", "Sắp xếp", "task_type", "SENTENCE_ORDERING",
                "option_a", "a", "option_b", "b",
                "correct_order", "A,A")));

        assertThat(result.rows()).isEmpty();
        assertThat(result.errors()).anySatisfy(error ->
                assertThat(error).contains("lặp lại"));
    }

    /** Dạng tự luận chấm bằng rubric, không có answer key để import. */
    @Test
    void rejectsEssayTaskTypes() {
        var result = parse(row(Map.of(
                "code", "E1", "part_code", "W1", "component_code", "WRITING",
                "prompt", "Viết một đoạn văn", "task_type", "LONG_TEXT")));

        assertThat(result.rows()).isEmpty();
        assertThat(result.errors()).anySatisfy(error ->
                assertThat(error).contains("LONG_TEXT").contains("không import được"));
    }

    @Test
    void reportsRowNumberSoEditorCanFindTheProblem() {
        var result = parse(
                row(Map.of("code", "A", "part_code", "R1", "component_code", "READING",
                        "prompt", "ok", "option_a", "x", "option_b", "y",
                        "correct_option", "A")),
                row(Map.of("code", "B", "part_code", "R1", "component_code", "READING",
                        "prompt", "hỏng", "option_a", "x", "option_b", "y",
                        "correct_option", "Z")));

        assertThat(result.rows()).hasSize(1);
        // Dòng 1 là tiêu đề nên dòng dữ liệu thứ hai là dòng 3
        assertThat(result.errors()).anySatisfy(error ->
                assertThat(error).startsWith("Dòng 3:"));
    }

    // -----------------------------------------------------------------

    @SafeVarargs
    private final QuestionSetExcelParser.ParseResult parse(Map<String, String>... dataRows) {
        return parser.parse(workbook(dataRows));
    }

    private static Map<String, String> row(Map<String, String> values) {
        return values;
    }

    @SafeVarargs
    private static byte[] workbook(Map<String, String>... dataRows) {
        try (XSSFWorkbook workbook = new XSSFWorkbook();
             ByteArrayOutputStream out = new ByteArrayOutputStream()) {

            Sheet sheet = workbook.createSheet("questions");

            Row header = sheet.createRow(0);
            for (int i = 0; i < HEADER.size(); i++) {
                header.createCell(i).setCellValue(HEADER.get(i));
            }

            for (int r = 0; r < dataRows.length; r++) {
                Row row = sheet.createRow(r + 1);
                Map<String, String> values = dataRows[r];
                for (int c = 0; c < HEADER.size(); c++) {
                    String value = values.get(HEADER.get(c));
                    if (value != null) {
                        row.createCell(c).setCellValue(value);
                    }
                }
            }

            workbook.write(out);
            return out.toByteArray();

        } catch (Exception ex) {
            throw new IllegalStateException("Không dựng được workbook test", ex);
        }
    }
}
