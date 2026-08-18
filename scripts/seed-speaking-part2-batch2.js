// Seed 17 đề Speaking Part 2 LÔ 2 (đề 18–34) vào MongoDB.
//
// Chạy ĐÚNG THỨ TỰ:
//   node scripts/upload-speaking-part2-batch2-images.js
//   docker exec -i aptis-mongo mongosh --quiet < scripts/seed-speaking-part2-batch2.js
//   node scripts/gen-speaking-part2-batch2-sql.js
//   docker exec -i aptis-mysql mysql -uaptis -paptis --default-character-set=utf8mb4 aptis < scripts/seed-speaking-part2-batch2.sql
//   docker exec -i aptis-mysql mysql -uaptis -paptis --default-character-set=utf8mb4 aptis < scripts/speaking-part2-batch2-assets.sql
//
// Ảnh dùng LÔ MỚI (không lấy lại 17 ảnh của lô 1). Mỗi ảnh đã được xem để bài
// mẫu câu 1 miêu tả đúng nội dung thật, vì tên file không luôn khớp ảnh (ví dụ
// "Người mẹ đọc sách cùng con gái.jpg" thực tế là mẹ chơi cờ với hai con).
//
// Prefix UUID a6/e6 — a2 đã bị Reading Part 2 dùng, a5/e5 là lô 1 Speaking P2.

const target = db.getSiblingDB('aptis');

const PART_ID = '16000000-0000-4000-8000-000000000032'; // Speaking Part 2
const TASK_TYPE = 'AUDIO_RECORDING';

const PREP_SECONDS = 0;
const RESPONSE_SECONDS = 45;
const MIN_WORDS = 60;
const MAX_WORDS = 90;
const ITEM_SCORE = 5;

const TOPICS = [
  {
    topic: 'Đọc sách',
    image: 'Người mẹ ôm con và đọc sách.jpg',
    hot: 4,
    year: null,
    questions: [
      ['Describe the picture?',
        'In this picture I can see a woman and a small girl lying in a large bed with white sheets and pillows. The woman has fair hair tied back and is holding an old hardback book open in front of them, pointing at the page. The little girl has red hair and her mouth is wide open, as if she is surprised or laughing at the story. Bright daylight is coming through the window behind them.'],
      ['What do you usually read?',
        'Mostly novels, and quite a lot of news on my phone, which I probably should reduce. I try to finish one book a month, usually fiction, because non-fiction feels too much like work in the evening. I also read a great deal in English for my job, although that is technical documents rather than anything enjoyable. What I never do is read poetry, honestly, because I find it difficult.'],
      ['Why is reading important for children?',
        'I think the main reason is vocabulary. Children who are read to hear far more words than they would in ordinary conversation, and that affects everything they learn later. It also teaches concentration, which is genuinely hard now with so many screens around. And there is the emotional side: sitting with a parent and a book is a form of attention that a tablet cannot replace.'],
    ],
  },
  {
    topic: 'Bố mẹ quan tâm con cái',
    image: 'Gia đình nằm thư giãn trên bãi cỏ (2026).jpg',
    hot: 5,
    year: 2026,
    questions: [
      ['Describe the picture?',
        'In this picture I can see a young couple sitting on the grass in a garden with a baby between them. The man is on the left wearing a white shirt and light trousers, and the woman on the right is in a dark blue top, leaning towards the child. The baby is wearing dungarees and looking straight at the camera with a very surprised expression. There is a blanket with a strawberry pattern underneath them.'],
      ['In your country, do parents care about their children?',
        'Yes, extremely, sometimes too much in my opinion. In Vietnam parents are heavily involved in their children\'s education, and it is normal for them to choose the university and even the career. Many families spend a large part of their income on extra classes. The care is genuine, but it can become pressure, and I think younger parents are slowly becoming more relaxed about it.'],
      ['Why do parents care about their children?',
        'Partly it is simply instinct, I think, the same in every country. But in my culture there is also a strong sense of duty across generations: parents sacrifice for their children, and children are expected to look after their parents later. So caring is not only emotional; it is part of how families are structured. And for many parents, their child\'s success is how they measure their own life.'],
    ],
  },
  {
    topic: 'Tặng quà',
    image: 'Cô gái tặng quà bất ngờ cho mẹ.jpg',
    hot: 4,
    year: null,
    questions: [
      ['Describe the picture?',
        'In this picture I can see a girl on the left and a woman on the right, standing in front of a plain white wall and facing each other. Between them there is a paper banner made of brown flags that says "Happy Mother\'s Day". The girl is holding a bunch of orange tulips, which we can just see at the bottom of the frame. The woman is smiling widely, so it is clearly a surprise.'],
      ['Tell me about a time you received or gave gifts?',
        'Last year I gave my mother a set of good cooking knives for her birthday, which sounds unromantic but she had complained about the old ones for years. She was genuinely pleased. As for receiving, my colleagues gave me a small plant when I changed department, and it is still on my desk. I prefer useful gifts, honestly, to anything decorative.'],
      ['On what occasions do people in your country give gifts?',
        'Tet is the biggest one, when adults give children red envelopes with money, and people bring gifts when visiting relatives. Apart from that, weddings, birthdays, and Teachers\' Day on the twentieth of November, which is quite important here. Giving money rather than objects is very common and completely acceptable, which I think surprises people from other countries. For younger people, gift cards are also becoming popular now.'],
    ],
  },
  {
    topic: 'Giao thông công cộng',
    image: 'Người đàn ông chờ tàu hỏa.jpg',
    hot: 4,
    year: 2026,
    questions: [
      ['Describe the picture?',
        'In this picture I can see a young man standing on an underground platform, leaning against a marble wall and looking towards the camera. He is wearing a green woollen hat, a black coat, and large black headphones around his neck, and he is holding a green folder or book under his arm. On the right there is the empty track and a yellow wall with a screen showing information.'],
      ['Tell me about the last time you used public transport',
        'I use the bus almost every day, so the last time was this morning. It takes about thirty-five minutes to my office, which is longer than a motorbike but far less stressful, especially when it rains. It was crowded and I stood for most of the journey. I usually listen to a podcast, so I do not really mind. Driving myself in that traffic would leave me exhausted before work even starts.'],
      ['How can we increase the number of people using public transport?',
        'Frequency is the main thing, I think. If a bus comes every five minutes people will use it without planning; if it comes every twenty-five they will not. Beyond that, dedicated lanes so buses are not stuck in the same traffic, and clean, air-conditioned vehicles. Making it cheaper helps, but in my experience reliability matters more than price. People will pay a little more for a service they can actually depend on every morning.'],
    ],
  },
  {
    topic: 'Đi xe hơi',
    image: 'Gia đình ngồi trong ô tô (2026).jpg',
    hot: 4,
    year: 2026,
    questions: [
      ['Describe the picture?',
        'In this picture I can see a family at a white car with the door open. A man with a beard is sitting in the driver\'s seat holding a small boy on his lap, and the boy is playing with the car key and smiling at the camera. On the left a woman in a dark red T-shirt is leaning in through the open door, laughing. The light looks like late afternoon sunshine.'],
      ['Tell me the last time you traveled in a car?',
        'About three weeks ago my family drove to my grandparents\' house in the countryside, which takes roughly two and a half hours. My uncle drove and I sat in the back with my sister. The traffic leaving the city was terrible, so it actually took nearly four hours. We stopped once for coffee, and I slept for part of it.'],
      ['How can people overcome the time of a long journey?',
        'Music and podcasts are the obvious answer, and they work for me. Beyond that, I think planning proper stops makes an enormous difference: getting out of the car for ten minutes every two hours changes how tired you feel at the end. Travelling with someone you can talk to also helps. What does not work is looking at the clock.'],
    ],
  },
  {
    topic: 'Tin tức truyền hình',
    image: 'Một người đang được phỏng vấn (2026).jpg',
    hot: 5,
    year: 2026,
    questions: [
      ['Describe the picture?',
        'In this picture I can see a young woman standing outdoors and speaking into a black microphone, which she is holding in front of her. She has wavy dark hair and dark red lipstick, and she is wearing a bright red tweed jacket. On the left of the frame there is a video camera slightly out of focus, with someone\'s hand on it. Behind her there are houses, so she is clearly reporting.'],
      ['Do you prefer reading newspapers or watching news?',
        'Reading, definitely. I can read an article in two minutes and skip the parts I do not need, whereas a broadcast makes you wait through everything in order. Watching news also feels more emotional than informative, because of the pictures. My parents are the opposite: they trust the seven o\'clock broadcast far more than anything written online, and they have watched the same programme for over twenty years.'],
      ['Why do people need to watch the news?',
        'Mainly to know what is happening around them, especially things that affect daily life, such as new regulations, weather warnings or traffic. I also think it matters for being a citizen: it is hard to have an opinion about anything if you do not know what has happened. Having said that, I believe checking once a day is enough. Reading the news constantly makes me anxious without making me better informed at all.'],
    ],
  },
  {
    topic: 'Chơi cùng con',
    image: 'Gia đình cùng nhau nấu ăn (2026).jpg',
    hot: 4,
    year: 2026,
    questions: [
      ['Describe the picture?',
        'In this picture I can see a girl of about six pouring sugar or salt from a small glass jar into a large glass bowl of beaten eggs, with a metal whisk in it. Next to her on the right there is a man in a black and white striped T-shirt making an "okay" sign with his hand. On the wooden table there are some broken eggshells on a wooden plate.'],
      ['Why is it important to play with children?',
        'Because it is how children learn most things at that age, rather than being told. Playing teaches them to take turns, to lose without crying, and to solve small problems themselves. I also think it matters for the relationship: a child who plays with a parent talks to that parent later. It is attention, and children notice attention immediately. They can tell straight away when an adult is only pretending to listen to them.'],
      ['How should parents spend time together with their children?',
        'Doing ordinary things together, in my opinion, rather than organising special outings. Cooking, shopping, walking to school — those are the moments when children actually talk. What matters is that the parent is not looking at a phone at the same time. Twenty minutes of proper attention is worth more than a whole day of being in the same room.'],
    ],
  },
  {
    topic: 'Mua sắm ở siêu thị',
    image: 'Người phụ nữ mua sắm trong siêu thị (2026).jpg',
    hot: 4,
    year: 2026,
    questions: [
      ['Describe the picture?',
        'In this picture I can see a young woman with long blonde hair leaning over a green shopping trolley in a supermarket. She is wearing a cream jumper and jeans, and she has one hand raised to her ear as if she is on the phone or pushing her hair back. She is looking down, perhaps at a list. On the right there are shelves full of packaged food.'],
      ['Tell me about the last time you went shopping?',
        'I went to the supermarket near my house on Saturday morning to buy food for the week. It took about forty minutes and I spent more than I had planned, mainly because I went while I was hungry, which is always a mistake. I bought vegetables, rice, eggs and far too many snacks. I try to go early because it becomes extremely crowded after ten. By midday the queues at the checkout are genuinely unpleasant on a weekend.'],
      ['Why do many people enjoy shopping with friends?',
        'Partly for the advice, I think: it is much easier to decide about clothes when someone tells you honestly how they look. But mostly it is social. Shopping together turns an errand into an afternoon out, with coffee in the middle. My sister and I do it that way, and we usually spend more time talking than buying anything, which is really the point of going.'],
    ],
  },
  {
    topic: 'Gia đình đi chơi ngoài trời',
    image: 'Hai bố con đạp xe (2026).jpg',
    hot: 3,
    year: 2026,
    questions: [
      ['Describe the picture?',
        'In this picture I can see a man and a boy cycling away from the camera along a narrow cycle path. Both are wearing light blue shirts, and the boy on the left is wearing a dark helmet. On the left there is a road with a line of small posts separating it from the path, and on the right a long white fence. There are trees and a stone building in the distance.'],
      ['In your country, do parents care about their children?',
        'Very much, and often in quite practical ways: driving them to extra classes, choosing their school, preparing their food. Vietnamese parents are also involved in decisions that in other countries would be private, such as which job to take. It comes from genuine care, although I think my generation will give our children more space than we were given. At least that is what I tell myself now, before actually having any.'],
      ['Why do parents care about their children?',
        'I think part of it is simply love, and part of it is that in my culture the family is treated as one unit rather than separate individuals. Parents plan for their children\'s future because they expect to depend on them later, and the children accept that. So the care goes in both directions, which is different from the way it works in some Western countries.'],
    ],
  },
  {
    topic: 'Triển lãm và tranh ảnh',
    image: 'Sắp xếp và trang trí phòng khách.png',
    hot: 3,
    year: null,
    questions: [
      ['Describe the picture?',
        'In this picture I can see a man and a woman hanging a large framed picture on a cream-coloured wall in a living room. The man on the left is wearing a beige T-shirt and brown trousers and holding the top of the frame; the woman on the right is in a knitted jumper and jeans, steadying the other side. Below them there is a bookshelf with plants, and a desk with a laptop on the right.'],
      ['Do you like visiting an exhibition?',
        'Yes, although I go far less often than I would like. I know very little about art, so I usually go with a friend who can explain what we are looking at. What I enjoy is the quiet: galleries are one of the few places in a city where nobody is in a hurry. I went to a lacquer painting exhibition a few months ago and stayed nearly two hours.'],
      ['What should teachers do to help young people like visiting exhibitions?',
        'I think the mistake is treating a gallery visit like a lesson with a worksheet. If children have to write answers, they rush. It would be better to let them choose one work they like and talk about why, without any correct answer. Teachers could also prepare them beforehand, because walking into a museum with no context is confusing for anyone.'],
    ],
  },
  {
    topic: 'Trẻ em chơi đồ chơi',
    image: 'Children playing with toys.jpg',
    hot: 4,
    year: null,
    questions: [
      ['Describe the picture?',
        'In this picture I can see two small children sitting on a white floor in a bedroom, playing with wooden toys. The girl on the left is wearing a dark red dress and holding a wooden animal, and the child on the right is in green dungarees holding a toy giraffe. Between them there is a tall tower of coloured wooden blocks. Behind them there is a bed with a white blanket and an alphabet poster.'],
      ['Why is it important to play with children?',
        'Because play is how children practise everything: sharing, waiting, building something and watching it fall over. If an adult joins in, the child also learns language much faster, because they hear words used in a real situation. And I think it matters that a child feels somebody wants to spend time with them, which is not something you can explain, only show.'],
      ['How should parents spend time together with their children?',
        'Regularly rather than lavishly, in my opinion. A short walk every evening is better than one expensive trip a year. I would also say let the child choose the activity sometimes, even if it is boring for the adult, because that is when they talk most freely. The important condition is that the phone is put away, because children notice divided attention immediately.'],
    ],
  },
  {
    topic: 'Cửa hàng địa phương',
    image: 'Cặp đôi đứng trước cửa hàng.jpg',
    hot: 3,
    year: null,
    questions: [
      ['Describe the picture?',
        'In this picture I can see a street with two shops. On the left there is a hair and beauty salon with a red and white barber pole and photographs of haircuts in the window. On the right there is a takeaway pizza shop with its metal shutter closed. In front of the shutter a couple are standing close together, the man in a denim jacket and the woman in black, looking down at something.'],
      ['Tell me the time you shopped in a local store?',
        'I buy something from the small shop at the end of my street almost every day, usually water or fruit. The owner knows what I normally buy, which is convenient. Yesterday I went there for eggs and ended up talking to her for ten minutes about the weather. It is more expensive than the supermarket but far quicker. For anything small I never consider going anywhere else now.'],
      ['Nowadays, why do people like shopping online?',
        'Convenience first: you can order at midnight without leaving the house, and it arrives the next day. Prices are usually lower too, because you can compare five shops in a minute. In my country delivery is extremely cheap, which makes a big difference. The disadvantage is that you cannot examine the product, so I still buy clothes and shoes in person.'],
    ],
  },
  {
    topic: 'Trò chơi trẻ em ngoài trời',
    image: 'Trẻ em chơi vòng trong vườn (2026).jpg',
    hot: 3,
    year: 2026,
    questions: [
      ['Describe the picture?',
        'In this picture I can see a young girl standing on grass with her back to the camera, playing with a yellow hula hoop around her waist. She is wearing a brightly patterned summer dress with purple, orange and white sections, and her arms are raised behind her head. Her long fair hair is loose. The garden behind her is out of focus but clearly green and sunny.'],
      ['Tell me about a game you played when you were a child.',
        'We played a hiding and chasing game in the alley near my house almost every evening after school. There were usually eight or nine of us, and the rules changed constantly depending on who was arguing. We had no equipment at all, just the street. I remember being called home for dinner and pretending not to hear. That game cost nothing and I remember it far better than any toy I owned.'],
      ['How have the children\'s games changed in the last 50 years?',
        'Enormously. My parents played outside with whatever they found, in a group of neighbours, with no adult watching them at all. Children now play mostly indoors and often alone with a screen, even when they are technically playing with other people online. I would not say games have got worse, because some are genuinely creative, but children move much less and negotiate with each other much less than they used to.'],
    ],
  },
  {
    topic: 'Động vật',
    image: 'Người mẹ và em bé cưỡi ngựa.jpg',
    hot: 3,
    year: null,
    questions: [
      ['Describe the picture?',
        'In this picture I can see a man sitting on a dark brown horse inside a fenced field. He is wearing sunglasses and a white T-shirt, and a wooden jumping pole crosses the front of the picture. At the bottom left there is a small boy watching him. Behind the fence there are tall green reeds, some trees, and a bare hill under a pale sky.'],
      ['Tell me about an animal that you like?',
        'I like dogs, particularly large calm ones. My family had a dog for about eleven years when I was growing up, and he followed my mother everywhere around the house. I like them because they are straightforward: you always know how a dog feels about you. I would have one now, but my apartment is far too small. It would not be fair to keep a large dog in two rooms.'],
      ['How important are animals in our lives?',
        'More important than we usually notice. Practically, we depend on them for food and, in the countryside, for work. But I was thinking more about company: for elderly people living alone, a cat or a dog is often the main reason they talk during the day. There is also evidence that having a pet reduces stress, which I believe. My aunt certainly seems calmer since she adopted her cat two years ago.'],
    ],
  },
  {
    topic: 'Tặng hoa',
    image: 'Cậu bé tặng hoa bất ngờ cho mẹ.jpg',
    hot: 3,
    year: null,
    questions: [
      ['Describe the picture?',
        'In this picture I can see two people standing in front of a white wall, facing each other in profile. On the left there is a girl with curly hair tied up, and on the right a woman who is smiling broadly. Between them hangs a banner made of brown paper flags spelling "Happy Mother\'s Day". At the bottom of the frame we can see a bunch of orange tulips being held up.'],
      ['Tell me about a time when you gave or received some flowers?',
        'I gave my mother flowers on the eighth of March last year, which is International Women\'s Day and quite a big occasion in Vietnam. I bought roses on the way home from work, and the price had roughly tripled because of the date. She put them on the table and mentioned them for about a week. I should probably do it more often than once a year, honestly.'],
      ['On what occasions in your country do people give flowers?',
        'Women\'s Day on the eighth of March, Teachers\' Day in November, and Vietnamese Women\'s Day in October are the main ones. Flowers are also normal at weddings, graduations and hospital visits. What is slightly different from other countries is that flowers are often given publicly at ceremonies rather than privately between two people. You see whole rows of bouquets on a stage at graduation events here.'],
    ],
  },
  {
    topic: 'Đến trường',
    image: 'Học sinh lên xe buýt.jpg',
    hot: 3,
    year: null,
    questions: [
      ['Describe the picture?',
        'In this picture I can see a yellow American school bus stopped on a wet road, with its headlights on and a red stop sign extended on the right. A child with a bag over her shoulder is stepping towards the open door at the front. Everything around is covered in snow: the trees, the parked car on the left, and the ground. It looks extremely cold and probably early morning.'],
      ['How do children go to school in your country?',
        'Most children are taken by their parents on a motorbike, which is the normal image of a Vietnamese morning. Older students often cycle or take the public bus, and a few private schools have their own buses. Almost nobody walks far, partly because of the traffic and partly because parents worry about safety. The pavements in my city are usually full of parked motorbikes anyway.'],
      ['Is it common to live far from school in your country? Why?',
        'It is quite common in cities, yes, because parents choose the school by reputation rather than distance. Many children travel thirty or forty minutes each way for that reason. In the countryside the opposite is true: there is one school and everyone goes there. I think the travelling is a real cost that families accept too easily. An hour a day on the road is an hour not spent studying or sleeping.'],
    ],
  },
  {
    topic: 'Đi chơi cùng người khác',
    image: 'Group drinking coffee.jpg',
    hot: 4,
    year: null,
    questions: [
      ['Describe the picture?',
        'In this picture I can see three people sitting around a small round metal table outdoors, each with a large paper cup with a straw in it. On the left there is a man in a grey sweatshirt and glasses, in the middle a woman with sunglasses and fair hair, and on the right a woman in a dark jacket. Behind them there is water and two stone planters with green plants.'],
      ['When was the last time you went on vacation with someone else?',
        'About eight months ago I went to Da Nang for a long weekend with three friends. We shared a small hotel near the beach, which was cheaper and much more fun than travelling alone. We disagreed constantly about what time to get up, but that is normal. I would travel with the same group again without hesitating. Sharing the cost also meant we could afford somewhere much nicer than I could alone.'],
      ['What are the benefits of hanging out with other people?',
        'The obvious one is that things are simply more enjoyable when shared, whether that is a meal or a trip. But I also think other people change how you think: in a conversation you hear opinions you would never have reached alone. And practically, spending time with friends is what keeps a friendship alive, because it does not survive on messages.'],
    ],
  },
];

if (TOPICS.length !== 17) {
  throw new Error('Kỳ vọng 17 đề, thực tế ' + TOPICS.length);
}

/** Prefix a6 để không đụng lô 1 (a5) và Reading Part 2 (a2). */
const idOf = (index) => 'a6000000-0000-4000-8000-' + String(index + 1).padStart(12, '0');

let upserted = 0;

TOPICS.forEach((entry, index) => {
  if (entry.questions.length !== 3) {
    throw new Error('Đề ' + (index + 1) + ' phải có đúng 3 câu');
  }

  const id = idOf(index);
  const assetId = 'e6000000-0000-4000-8000-' + String(index + 1).padStart(12, '0');
  const title = `${entry.questions[1][0]} (${entry.topic})`;

  const items = entry.questions.map(([question, sample], seq) => ({
    id: 'item_' + (seq + 1),
    sequenceNo: NumberInt(seq + 1),
    prompt: { format: 'PLAIN_TEXT', value: question },
    responseType: 'AUDIO_RECORDING',
    required: true,
    maxScore: ITEM_SCORE,
    options: [],
    leftItems: [],
    rightItems: [],
    constraints: {
      prepSeconds: PREP_SECONDS,
      responseSeconds: RESPONSE_SECONDS,
      minWords: MIN_WORDS,
      maxWords: MAX_WORDS,
    },
    rubricCode: 'APTIS_SPEAKING',
    answerKey: null,
    explanation: { format: 'PLAIN_TEXT', value: sample },
  }));

  target.question_set_documents.replaceOne(
    { _id: id },
    {
      _id: id,
      questionSetId: id,
      revision: NumberInt(1),
      schemaVersion: NumberInt(1),
      partId: PART_ID,
      taskTypeCode: TASK_TYPE,
      title: title,
      instructions: 'Nhìn ảnh và trả lời 3 câu hỏi. Mỗi câu nói 45 giây (khoảng 60–90 từ).',
      accessLevel: 'PREMIUM',
      stimulus: null,
      sections: [],
      items: items,
      assets: [{ assetId: assetId, role: 'MAIN_IMAGE', displayOrder: NumberInt(1) }],
      settings: {
        shuffleOptions: false,
        shuffleItems: false,
        maxAudioPlays: null,
        showAnswerAfterEachItem: false,
        allowReview: true,
      },
      scoring: { strategy: 'RUBRIC', partialCredit: true, maxScore: ITEM_SCORE * 3 },
      createdAt: new Date(),
      updatedAt: new Date(),
    },
    { upsert: true });
  upserted++;
});

print('Da upsert ' + upserted + ' de Speaking Part 2 lo 2');
print('Tong de Part 2 trong Mongo = ' +
  target.question_set_documents.countDocuments({ partId: PART_ID }));
