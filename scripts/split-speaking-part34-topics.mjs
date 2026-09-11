/**
 * Tách chủ đề cho Speaking Part 3 và Part 4, rồi in ra SQL để đưa vào bản tin
 * dự đoán.
 *
 * Vì sao cần: bản tin của mình chưa có mục Speaking Part 3/Part 4 nào, trong
 * khi ngân hàng đã có 90 đề Part 3 và 27 đề Part 4. Part 4 chưa đề nào gắn chủ
 * đề; Part 3 thì mỗi "chủ đề" lại là nguyên một câu hỏi, đưa thẳng vào bản tin
 * sẽ ra hàng chục dòng dài không đọc được.
 *
 * Nhãn chủ đề lấy theo bản tin đối thủ mà anh gửi (Part 3: so sánh tranh theo
 * cặp; Part 4: "Lần ..." kể trải nghiệm) để học viên tra cho quen mắt.
 *
 * Chỉ sinh SQL, không tự ghi DB — mysql2 không nối được từ host (MySQL 8.4
 * caching_sha2_password), nên chạy bằng:
 *   node scripts/split-speaking-part34-topics.mjs > scripts/sql/speaking-part34.sql
 *   docker exec -i aptis-mysql mysql -uroot -proot --default-character-set=utf8mb4 aptis < scripts/sql/speaking-part34.sql
 */
import { randomUUID } from 'node:crypto';

const PART_3 = '16000000-0000-4000-8000-000000000033';
const PART_4 = '16000000-0000-4000-8000-000000000034';

/**
 * [nhãn chủ đề, từ khoá]. Luật hẹp đứng trước luật rộng vì tiêu đề khớp nhiều
 * luật thì lấy luật đầu tiên.
 */
const RULES_P3 = [
  ['Thư viện vs quán cà phê', ['library or coffee', 'library or cafe', 'better for studying', 'studying outdoors', 'learning outdoors', 'studying with a tablet']],
  ['Học online vs học trên lớp', ['traditional classroom', 'online']],
  ['Làm một mình vs làm nhóm', ['working alone', 'part of a team']],
  ['Ở nhà vs văn phòng', ['working from home', 'work from home', 'office with working from home']],
  ['Làm việc trong nhà máy vs văn phòng', ['factory or workshop', 'working on a farm and working in an office', 'two places of working', 'office rather than working outdoors']],
  ['Đọc sách vs chơi game', ['printed books', 'e-books', 'chess or playing video', 'chess or video', 'intellectual games']],
  ['Thể thao trong nhà vs ngoài trời', ['indoor and outdoor sports', 'these sports', 'these 2 sports', 'these two sports', 'football and volleyball', 'favorite sport', 'prefer playing sports']],
  ['Ăn healthy vs fast food', ['healthy food', 'these types of food', 'each kind of food', 'which food do you prefer']],
  ['Ăn ở nhà vs ăn ngoài', ['eating at home', 'eating at a restaurant', 'eating at different places', 'eating in these different places', 'where do you prefer to eat', 'eating at home or eating out', 'eat at different places']],
  ['Nấu ăn cùng gia đình vs nấu một mình', ['cooking with family', 'cooking at an outdoor barbecue', 'cooking indoors']],
  ['Chợ vs siêu thị', ['market and shopping at a supermarket', 'markets and supermarkets', 'shopping malls or local markets', 'shopping in these two places', 'buying in the two places']],
  ['Du lịch bằng tàu vs máy bay vs ô tô', ['travelling by car', 'travelling by plane', 'traveling by car', 'by plane than by train', 'two ways of travelling', 'two ways of traveling', 'these two vehicles', 'public transport with travelling by bicycle', 'travelling by plane and travelling by train', '2 ways of traveling']],
  ['Biển vs núi vs thành phố', ['beach and climbing a mountain', 'crowded beaches', 'pine forest or beach', 'snowy mountain and a desert', 'these two places', 'visiting these two places', 'which place do you like more', 'two pictures do you prefer to go', 'which of the 2 places']],
  ['Mùa hè vs mùa đông', ['summer and a city in winter', 'hot coastal city', 'snowy city']],
  ['Sống ở thành phố vs nông thôn', ['crowded city', 'city or in the suburbs', 'where do you prefer to live', 'where would you rather live', 'types of people live in these places']],
  ['Sống với gia đình vs sống một mình', ['living with family', 'living with family or alone']],
  ['Bảo tàng vs nơi vui chơi', ['museum or the playground']],
  ['Âm nhạc: nghe ở nhà vs xem trực tiếp', ['listening to music at home', 'live stage performance', 'enjoy music', 'play music']],
  ['Nuôi động vật trong nhà', ['keeping a dog', 'interacting with animals', 'raise these animals', 'saw farm animals']],
  ['Làm vườn / trồng cây', ['gardening', 'growing a garden', 'growing vegetables']],
  ['Nhặt rác vs trồng cây', ['picking up litter', 'planting trees', 'volunteering']],
  ['Chụp ảnh vs viết nhật ký', ['taking selfies', 'landscape photos', 'taking photos or writing']],
  ['Việc nhà', ['chores']],
  ['Giải trí: hai hình thức', ['two forms of entertainment', 'these activities', 'these two activities', 'which activity do you prefer', 'free time activities', 'spend your free time', 'outdoor play and using a phone']],
];

const RULES_P4 = [
  ['Lần học kỹ năng / ngôn ngữ mới', ['learned something new']],
  ['Lần thử một điều mới / mạo hiểm', ['extreme sport']],
  ['Lần vượt qua khó khăn', ['challenging situation', 'tried hard to achieve']],
  ['Lần làm điều mình không thích', ['didn’t want to', "didn't want to"]],
  ['Lần giúp ai đó / được giúp đỡ', ['helped someone', 'supported by others']],
  ['Lần làm việc nhóm', ['work with other people']],
  ['Lần đặt câu hỏi', ['asked a question']],
  ['Lần nói chuyện với người lớn / nhỏ tuổi hơn', ['older or younger']],
  ['Lần thăm ai đó', ['visited someone']],
  ['Lần nhận tin tốt', ['good news']],
  ['Lần nhận quà / tặng quà', ['received a gift', 'gave someone possession']],
  ['Lần mua đồ đắt tiền', ['expensive thing', 'saved up to buy', 'couldn’t buy', "couldn't buy"]],
  ['Lần đọc một quyển sách hay', ['read a good book']],
  ['Lần xem tác phẩm nghệ thuật', ['work of art']],
  ['Lần đi chơi công viên giải trí', ['amusement park']],
  ['Lần hoà mình vào thiên nhiên', ['surrounded by nature']],
  ['Lần vội vã / bận rộn', ['in a hurry', 'were busy']],
  ['Lần đứng trước nhiều lựa chọn', ['faced a choice']],
  ['Lần sử dụng Internet', ['used the internet']],
];

/** Chủ đề của một tiêu đề, hoặc null nếu không luật nào khớp. */
function resolve(title, rules) {
  const text = ` ${String(title ?? '').toLowerCase()} `;
  for (const [topic, keywords] of rules) {
    if (keywords.some((kw) => text.includes(kw))) return topic;
  }
  return null;
}

export { RULES_P3, RULES_P4, resolve, PART_3, PART_4, randomUUID };
