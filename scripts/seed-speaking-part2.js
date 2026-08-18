// Seed 17 đề Speaking Part 2 (miêu tả ảnh + 2 câu mở rộng) vào MongoDB.
//
// Chạy ĐÚNG THỨ TỰ:
//   node scripts/upload-speaking-part2-images.js     # đẩy ảnh lên MinIO + bảng assets
//   docker exec -i aptis-mongo mongosh --quiet < scripts/seed-speaking-part2.js
//   node scripts/gen-speaking-part2-sql.js
//   docker exec -i aptis-mysql mysql -uaptis -paptis --default-character-set=utf8mb4 aptis < scripts/seed-speaking-part2.sql
//
// Cấu trúc một đề: 1 ẢNH dùng chung + 3 câu hỏi, mỗi câu nói 45 giây (60–90 từ).
// Câu 1 luôn là miêu tả ảnh, câu 2 hỏi trải nghiệm bản thân, câu 3 hỏi ý kiến
// chung. Đây là format thật của Aptis Speaking Part 2.
//
// KHÁC Part 1 (mỗi câu một đề, backend gộp 3 câu qua merge-item-parts) và khác
// Part 4 (mỗi đề một bài nói dài): Part 2 có 3 câu CÙNG chia sẻ một ảnh, nên
// một đề = một bộ 3 item, không tách rời được.
//
// `explanation` là bài nói mẫu học viên xem tham khảo (nút "Xem câu mẫu").
// Bài mẫu câu 1 được viết theo ẢNH THẬT trong Aptis/speaking/part 2.

const target = db.getSiblingDB('aptis');

const PART_ID = '16000000-0000-4000-8000-000000000032'; // Speaking Part 2
const TASK_TYPE = 'AUDIO_RECORDING';

const PREP_SECONDS = 0;      // Part 2 không có thời gian chuẩn bị riêng từng câu
const RESPONSE_SECONDS = 45;
const MIN_WORDS = 60;
const MAX_WORDS = 90;
const ITEM_SCORE = 5;        // 3 câu × 5 = 15 điểm mỗi đề

// Mỗi phần tử: {
//   topic: tên chủ đề tiếng Việt,
//   image: tên file trong Aptis/speaking/part 2 (khớp thứ tự tải về),
//   hot: 1-5, year: null | 2026,
//   questions: [[câu hỏi, bài nói mẫu], × 3]
// }
const TOPICS = [
  {
    topic: 'Bữa sáng',
    image: '1 Hai bố con ăn sáng.jpg',
    hot: 4,
    year: null,
    questions: [
      ['Describe the picture?',
        'In this picture I can see a man and a young girl sitting opposite each other at a wooden dining table. They are both giving a thumbs-up sign and smiling at each other, so they look very happy. On the table there is a white bowl, a jar of cereal and some jars of spices near the window. The light coming through the curtain behind them is bright, so I think it is early morning. They seem to be father and daughter having breakfast together.'],
      ['What do you usually eat for breakfast?',
        'On weekdays I usually have something very quick because I am always in a hurry. Most mornings I just have bread with eggs and a cup of black coffee, which takes about ten minutes. At the weekend it is different. My family often goes out for pho or banh mi, and we take our time. I know I should eat more fruit in the morning, but honestly I rarely do.'],
      ['Is it important to eat a good breakfast? Why?',
        'Yes, I think it is quite important, although I do not always follow my own advice. When I skip breakfast I lose concentration by about ten o\'clock and I end up eating something unhealthy instead. A proper breakfast also seems to affect my mood, not just my energy. Having said that, I think what matters is eating something reasonable rather than eating a big meal, because a heavy breakfast makes me sleepy.'],
    ],
  },
  {
    topic: 'Tin tức và báo chí',
    image: '2 Người đàn ông đọc báo trước màn ti vi (2026).jpg',
    hot: 5,
    year: 2026,
    questions: [
      ['Describe the picture of a man reading a newspaper in front of a computer screen.',
        'In this picture I can see a young man sitting with his back to the camera, holding a large open newspaper in both hands. In front of him there is an old television set with a video player underneath it, and the screen seems to have no proper signal. The man has short dark hair and an earring, and he is wearing a black top. The room has plain walls and a wooden cabinet, so it looks quite old-fashioned.'],
      ['How do most people in your country learn about world news?',
        'These days most people in my country get their news from their phones rather than from newspapers. Facebook and online news sites are probably the main sources, especially for younger people. My parents still watch the evening news on television at seven o\'clock every day, which is a habit they have had for years. Printed newspapers are much less common now, although you still see older people reading them in cafés.'],
      ['How has the reporting of news changed in the last fifty years?',
        'It has changed enormously. Fifty years ago people waited for the newspaper or the evening broadcast, so news arrived once a day and was checked by editors first. Now anything can be published within seconds by anyone, which is faster but far less reliable. I think the biggest change is that we get much more information but have to do the checking ourselves, and many people simply do not.'],
    ],
  },
  {
    topic: 'Thư tay',
    image: '3 Người đàn ông viết thư.jpg',
    hot: 3,
    year: null,
    questions: [
      ['Describe the picture?',
        'In this picture I can see an older man with white hair and a white beard sitting at a small wooden table and writing on a sheet of paper with a pen. There is a brown envelope on the table next to him, so he is clearly writing a letter. Behind him there is a dark leather sofa, some green plants on the wall and a warm lamp on the right, which makes the room feel calm and quiet.'],
      ['Have you ever written a hand letter?',
        'Yes, but only a few times. The last one was a thank-you letter to my grandmother about three years ago, because she does not use a smartphone. I remember it took me nearly an hour for one page, and my handwriting was much worse than I expected. She kept that letter, though, which surprised me. Apart from that I mostly write cards at New Year rather than real letters.'],
      ['Do you plan to write handwritten letters in the future?',
        'Probably not regularly, to be honest, because messaging is simply far more convenient. However, I would like to write letters for special occasions, such as thanking someone properly or writing to my parents. A handwritten letter shows that you spent time on it, which a message never does. So I would say occasionally yes, but I cannot imagine going back to it as a normal way of communicating.'],
    ],
  },
  {
    topic: 'Xem tivi và thời gian rảnh',
    image: 'Người đàn ông đang năm xem ti vi (2026).jpg',
    hot: 4,
    year: 2026,
    questions: [
      ['Describe the picture?',
        'In this picture I can see a young man with a beard sitting comfortably on a grey sofa. He is holding a television remote control in his right hand and pointing it forward, and in his left hand he has a white cup, probably of coffee or tea. He is wearing a checked shirt over a yellow T-shirt and jeans. He looks relaxed and slightly amused, so I think he is choosing something to watch at home.'],
      ['Do you often watch TV?',
        'Not really, at least not traditional television. I probably watch the news with my parents two or three evenings a week, but I would not sit down and watch a channel on my own. Most of my screen time is on my laptop instead, watching videos or a series. My father is the opposite: the television is on almost all evening in our house, whether he is watching it or not.'],
      ['Why is free time important?',
        'I think free time matters because it is the only time when nobody is asking anything of you. Without it, work gradually fills every hour and you stop noticing how tired you are. For me free time is also when I actually learn things, because I read or practise something I chose myself. It is not simply about resting; it is about having a part of the day that belongs to you.'],
    ],
  },
  {
    topic: 'Biển',
    image: '5 Cô gái thư giãn trên du thuyền.jpg',
    hot: 3,
    year: null,
    questions: [
      ['Describe the picture?',
        'This picture is taken from above and shows a young woman lying on the white deck of a sailing boat. She has curly brown hair and her eyes are closed, with her arms folded behind her head. She is wearing a yellow top and a white jacket, and a white sail is bunched up beside her. There are ropes across the deck and dark water on the left, so the boat is clearly out on the sea.'],
      ['Tell us the last time you went to the sea?',
        'The last time was about eight months ago, when I went to Da Nang with three friends for a long weekend. We stayed in a small hotel near the beach and swam early in the morning before it became too hot. What I enjoyed most was actually sitting on the sand in the evening, when the beach was almost empty. I would happily go back tomorrow if I had the time.'],
      ['Why do some people dislike going to the sea?',
        'Several reasons, I think. Some people simply cannot swim, so the water feels dangerous rather than relaxing. Others dislike the practical side: the sand gets everywhere, the sun is uncomfortable and popular beaches are extremely crowded. I also know people who worry about jellyfish or strong currents, which is reasonable. And for families with small children, a day at the sea is genuinely hard work rather than a holiday.'],
    ],
  },
  {
    topic: 'Ăn uống cùng bạn bè',
    image: 'Nhóm bạn ăn uống tại nhà hàng (2026).jpg',
    hot: 4,
    year: 2026,
    questions: [
      ['Describe the picture?',
        'In this picture I can see three people sitting in what looks like an expensive restaurant, raising their glasses towards each other. There is a man in the middle wearing a white shirt, with a woman on each side of him. On the table in front of them there are several small dishes of food and a stand with bowls on it. The lighting is warm and there is a chandelier in the background, so it seems to be evening.'],
      ['Why do people like eating out with friends?',
        'I think the food is only part of it. Eating out gives you a reason to sit down together for two hours without anyone needing to cook or wash up, so the conversation is more relaxed. It also feels like an occasion rather than an ordinary evening. In my case, restaurants are often the only place my friends and I can all meet, because we live in different districts and everyone works late.'],
      ['Please talk about the last time you ate with friends?',
        'It was about two weeks ago. Four of us went to a small hotpot restaurant near my office to celebrate a friend getting a new job. We ordered far too much food, as usual, and stayed until the staff started cleaning around us. What I remember most is that we talked for nearly three hours, which almost never happens now that everyone is busy. I paid that time, and I did not mind at all.'],
    ],
  },
  {
    topic: 'Leo núi và hoạt động ngoài trời',
    image: 'Nhóm người leo núi (2026).jpg',
    hot: 4,
    year: 2026,
    questions: [
      ['Describe the picture?',
        'In this picture I can see a group of about seven climbers walking in a line along a rocky ridge. They are all wearing thick jackets with hoods, helmets and large backpacks, and some are carrying ice axes or poles. Around them there is a great deal of snow, with bare rocks showing through, and footprints crossing the slope behind them. It looks extremely cold and the ground seems difficult to walk on.'],
      ['Do you like to climb mountains?',
        'I like walking in the mountains, but I would not call it climbing. I have done Ba Vi and one longer trek in Sapa, both without any equipment. Real climbing with ropes and helmets looks impressive but also frightening to me, mainly because of the cold and the height. What I enjoy is the walking itself and reaching a point where you can see a long way, rather than the difficulty.'],
      ['Do you think outdoor activities are important?',
        'Yes, and I think they are becoming more important, not less. Most of us now spend the whole day sitting indoors looking at a screen, so a few hours outside makes a noticeable difference to how I sleep and how I feel. It is also the easiest way to spend time with people without a phone in your hand. I would say it does not need to be extreme; walking regularly is enough.'],
    ],
  },
  {
    topic: 'Đi đến nơi mới',
    image: 'Người mẹ cõng con trên vai.jpg',
    hot: 3,
    year: null,
    questions: [
      ['Describe the picture of a parent carrying a child outdoors.',
        'In this picture I can see a woman carrying a young girl on her shoulders in a forest. The woman has long blonde hair and is wearing an orange leather jacket, and the girl is wearing a beige coat and white boots. The woman is holding a bunch of yellow autumn leaves in one hand. Behind them there are tall thin trees and strong sunlight, so it looks like a late afternoon in autumn.'],
      ['When was the last time you visited a new place?',
        'About four months ago I visited Ninh Binh for the first time, which is strange because it is only two hours from my city. We took a boat through the caves and cycled around the villages in the afternoon. I had seen photographs many times, but being there was completely different, mainly because of how quiet it was. Since then I have been trying to visit one new place every few months.'],
      ['Why do people like to go to new places?',
        'I think mainly because a new place forces you to pay attention. At home you stop noticing anything, whereas somewhere unfamiliar you look at the buildings, the food and how people behave. It also gives you stories to tell afterwards, which is part of the pleasure. And for some people, including me, travelling is a way of taking a real break, because you cannot easily keep working somewhere new.'],
    ],
  },
  {
    topic: 'Mua sắm',
    image: 'Nhóm phụ nữ đi mua sắm (2026).jpg',
    hot: 4,
    year: 2026,
    questions: [
      ['Describe the picture?',
        'In this picture I can see three young women standing together in a shopping centre, smiling at the camera. Each of them is holding several paper shopping bags in different colours: red, pink, green and black. One woman on the right is wearing glasses and a pink jacket, and the one in the middle has short dark hair. Behind them I can see shop fronts and a bright corridor, so they have clearly been shopping.'],
      ['Tell me the last time you went shopping?',
        'The last real shopping trip was about a month ago, when I needed shoes for work. I went to a shopping centre near my house on Sunday afternoon, which was a mistake because it was extremely crowded. I tried on perhaps six pairs and bought one. Most of my shopping now is online, honestly, and I only go to a shop when I need to try something on first.'],
      ['Why do some people dislike busy places?',
        'For some people it is simply tiring. Noise, crowds and having to queue for everything take a lot of energy, and after an hour you want to leave regardless of what you came for. I also think busy places make it hard to think clearly, so you either buy the wrong thing or buy nothing at all. Personally I prefer going early in the morning, when the same place feels completely different.'],
    ],
  },
  {
    topic: 'Phim ảnh và học qua video',
    image: 'Người cầm điều khiển chọn kênh truyền hình.jpg',
    hot: 3,
    year: null,
    questions: [
      ['Describe the picture?',
        'In this picture I can see a woman lying on a bed or sofa, holding a black remote control towards the camera. The remote is in focus while her face is slightly blurred, so it is clearly the main subject. She is wearing a light blue vest top with a red scarf around her neck, and there are patterned cushions and a blanket around her. She looks relaxed, as if she is choosing a channel at home.'],
      ['How often do you watch films or programmers at home? Why?',
        'I watch something at home most evenings, usually one episode of a series while I eat dinner. At the weekend I sometimes watch a full film, but honestly I often fall asleep halfway through. The reason is simply that it is the easiest way to relax after work; it takes no planning and costs nothing. Going to the cinema is more enjoyable, but I only do that a few times a year.'],
      ['Which is better for learning, watching video or reading? Why?',
        'I think it depends on what you are learning. For anything practical, such as fixing something or cooking, video is far better because you can see exactly what to do. But for understanding an idea properly, I find reading better, because I can stop, go back and think. Video moves at its own speed and it is easy to feel that you understood something when you did not.'],
    ],
  },
  {
    topic: 'Nghệ thuật',
    image: 'Người đàn ông vẽ tranh.jpg',
    hot: 3,
    year: null,
    questions: [
      ['Describe the picture?',
        'In this picture I can see a person standing at a wooden easel and painting on a canvas. They are wearing a dark apron which is completely covered in spots of paint, over a light grey shirt with rolled-up sleeves, and holding a brush and a palette. On the table at the bottom left there are many tubes of paint and a glass of blue water. Behind them there is a large green plant and a bright white wall.'],
      ['Describe the last time you looked at some art',
        'It was a few months ago, when a friend took me to a small exhibition of lacquer paintings in my city. There were about twenty works by one artist, and the gallery was very quiet. I know almost nothing about art, so I mainly noticed how the colours changed as I moved. I stood in front of one painting of a village at dusk for several minutes without really knowing why.'],
      ['Why do people enjoy creating art?',
        'I think partly because it is one of the few activities with no correct answer, so there is no pressure to be right. My cousin paints at the weekend and says it is the only time she stops thinking about work. There is also the satisfaction of making something physical that did not exist before, which most office jobs never give you. And of course some people simply enjoy being good at it.'],
    ],
  },
  {
    topic: 'Hoạt động ngoài trời cùng gia đình',
    image: 'Hai bố con chơi bóng đá (2026).jpg',
    hot: 4,
    year: 2026,
    questions: [
      ['Describe the picture?',
        'In this picture I can see a man and a very young child playing football on grass in a garden. The man is wearing a black T-shirt, a cap and light brown trousers, and he is bending forward with his hands near the child to support him. The little boy is wearing brown dungarees and a dark hat, and a black and white football is on the grass in front of him. There are green bushes and palm trees behind them.'],
      ['What are the benefits of outdoor activities?',
        'The obvious benefit is physical: you move around instead of sitting, and I always sleep better on days when I have been outside. But I think the mental side matters just as much. Being outdoors seems to reduce stress in a way that resting indoors does not. For children especially, outdoor play teaches them things a screen cannot, such as balance, taking turns and how to fall over without crying.'],
      ['Why do many people like outdoor activities?',
        'I think because they feel completely different from ordinary daily life. Most of us work indoors under artificial light, so fresh air and open space are a genuine change rather than just exercise. Outdoor activities are also easy to share: you can take children, friends or your parents with you. And they are usually cheap, which matters. A walk in a park costs nothing but still feels like doing something.'],
    ],
  },
  {
    topic: 'Bảo tàng và tác phẩm nghệ thuật',
    image: 'Mọi người xem tranh tại bảo tàng (2026).jpg',
    hot: 4,
    year: 2026,
    questions: [
      ['Describe the picture of people visiting a museum and looking at artwork.',
        'This is a black and white photograph of the inside of a large modern museum. I can see several floors connected by open balconies, with groups of visitors standing at the railings and looking down or across at the exhibits. On the right there is a white wall with the name of an exhibition written on it. The building has tall white pillars and very large windows, so the whole space looks bright and open.'],
      ['What are the benefits of viewing artworks?',
        'I think the main benefit is that it slows you down. Looking at a painting properly takes a few minutes, which is unusual in a normal day. It also shows you how someone else saw the world, sometimes hundreds of years ago, and that changes how you look at ordinary things afterwards. Personally I leave a gallery feeling calmer, in the same way that some people feel after exercise.'],
      ['Why do people like to go to art exhibitions?',
        'Some people go because they genuinely understand art and want to see a particular artist. But I think many go for other reasons: it is a pleasant way to spend an afternoon with someone, it gives you something to talk about, and museums are quiet and comfortable. There is also a social element now, because people photograph the works and share them. Not everyone goes for the art itself.'],
    ],
  },
  {
    topic: 'Thư giãn',
    image: 'Bé gái nằm nghe nhạc trên cỏ (2026).jpg',
    hot: 4,
    year: 2026,
    questions: [
      ['Describe the picture?',
        'In this picture I can see a teenage girl lying on the grass in a garden, listening to music with large white headphones. She is holding a white smartphone in front of her face and smiling as she looks at the screen. She has long dark hair and is wearing a white blouse with jeans, and her feet are raised behind her. The grass around her is long and there is a wooden chair in the background.'],
      ['What do you do to relax?',
        'Nothing very interesting, honestly. On weekday evenings I listen to music and cook, which I find surprisingly calming because it needs just enough attention. At the weekend I prefer to walk, usually around the lake near my house, for about an hour without my phone. I also read before bed. What does not work for me is watching videos, because I finish feeling more tired than when I started.'],
      ['Why is it important for people to relax?',
        'Because otherwise the tiredness simply accumulates. When I work several weeks without a proper break, I make careless mistakes and become impatient with people, and I do not notice it happening. Relaxing is not laziness; it is what makes the working hours useful. I also think we need time when nothing is required of us, because that is usually when we actually think about what we want.'],
    ],
  },
  {
    topic: 'Việc nhà và lao động',
    image: 'Cặp đôi dọn nhà (2026).jpg',
    hot: 3,
    year: 2026,
    questions: [
      ['Describe the picture?',
        'In this picture I can see two people cleaning a living room. On the right a person wearing a red headscarf and a green apron is holding a blue feather duster and reaching towards the sofa, smiling. On the sofa a young woman is sitting among orange and patterned cushions, holding a mop and looking up at the other person. Behind them there is a lamp, white cupboards and a shelf, so it is clearly indoors.'],
      ['Describe the last time you did some physical work.',
        'Last month I helped my parents move furniture when they redecorated the living room. It took the whole Sunday, and I was genuinely surprised how tired I was afterwards, because I sit at a desk all week. We carried a wardrobe down one flight of stairs, which was the hardest part. I ached for two days, but I also slept extremely well that night, better than after any gym session.'],
      ['Do you think machines will do all our hard work in the future? Why?',
        'A lot of it, certainly, but not all. Machines are already better than people at anything repetitive, and I expect that to continue. However, many jobs need judgement in a changing situation, such as caring for an elderly person or repairing something in an awkward space, and those seem much harder to automate. I also think cost matters: for many small tasks a person is simply cheaper than a machine.'],
    ],
  },
  {
    topic: 'Nấu ăn',
    image: 'Giáo viên hướng dẫn trẻ làm bánh (2026).jpg',
    hot: 4,
    year: 2026,
    questions: [
      ['Describe the picture?',
        'In this picture I can see a woman teaching two small children to bake in a large kitchen. The children are wearing yellow and blue chef hats and aprons, and one of them has a hand raised as if answering a question. The woman is wearing a black T-shirt and a light green apron and is smiling at them. On the counter there is rolled-out dough with circles cut in it, a bowl of chocolate chips and a metal bowl.'],
      ['How do people learn to cook in your culture',
        'Mostly at home rather than in classes. In my family my mother and grandmother taught me by letting me help, so I learned by watching rather than following written recipes. Almost nothing was measured; my mother still cannot tell me how much fish sauce to use. Younger people now also learn from YouTube and TikTok, which is how I learned to cook anything that is not Vietnamese food.'],
      ['Why is it important for people to learn how to cook for themselves?',
        'The practical reasons are money and health, because eating out every day is expensive and you have no idea what is in the food. But I think there is more to it than that. Cooking for yourself means you are not dependent on anyone, which matters a great deal when you first live alone. It is also one of the simplest ways to look after other people.'],
    ],
  },
  {
    topic: 'Thuyết trình',
    image: 'Đồng nghiệp họp trong văn phòng (2026).jpg',
    hot: 4,
    year: 2026,
    questions: [
      ['Describe the picture?',
        'In this picture I can see three women in what looks like an office or meeting room. On the left a woman with dark fringe is sitting in front of an open white laptop, looking at the screen with a serious expression. Behind her a woman with blonde hair is leaning forward holding a yellow cup, and on the right another woman is bending over the table. There is a glass bottle of water and some papers on the table.'],
      ['Tell us about the time you give a presentation. How did you feel?',
        'About six months ago I had to present the results of a small project to around twenty colleagues, including two managers. I was extremely nervous beforehand and my voice shook for the first minute or two. Then somebody asked a question I knew the answer to, and after that I forgot about being nervous. It lasted fifteen minutes and went far better than I had feared, honestly.'],
      ['Why are people scared of public speaking?',
        'I think it is mostly the fear of being judged rather than the speaking itself. In a normal conversation nobody is examining you, but in a presentation everyone is silent and looking at you, so every mistake feels enormous. There is also no way to hide: you cannot check your notes forever. What helped me was realising that the audience actually wants you to do well, not to fail.'],
    ],
  },
];

if (TOPICS.length !== 17) {
  throw new Error('Kỳ vọng 17 đề, thực tế ' + TOPICS.length);
}

/** UUID tiền định để chạy lại script không sinh bản ghi trùng. */
const idOf = (index) => 'a5000000-0000-4000-8000-' + String(index + 1).padStart(12, '0');

let upserted = 0;

TOPICS.forEach((entry, index) => {
  if (entry.questions.length !== 3) {
    throw new Error('Đề ' + (index + 1) + ' phải có đúng 3 câu');
  }

  const id = idOf(index);
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

  // Ảnh dùng chung cho cả 3 câu. assetId do upload-speaking-part2-images.js sinh
  // theo cùng công thức UUID, nên hai script luôn khớp nhau.
  const assetId = 'e5000000-0000-4000-8000-' + String(index + 1).padStart(12, '0');

  // Tiêu đề lấy câu 2 vì câu 1 luôn là "Describe the picture?" — khớp cách
  // gen-speaking-part2-sql.js đặt title trong MySQL.
  const title = `${entry.questions[1][0]} (${entry.topic})`;

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
      accessLevel: 'FREE',
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

print('Da upsert ' + upserted + ' de Speaking Part 2');
print(target.question_set_documents.countDocuments({ partId: PART_ID }) + ' de trong Mongo');
