// Seed 15 đề Speaking Part 2 LÔ 3 (đề 35–49) vào MongoDB.
//
// Chạy ĐÚNG THỨ TỰ:
//   node scripts/upload-speaking-part2-batch3-images.js
//   docker exec -i aptis-mongo mongosh --quiet < scripts/seed-speaking-part2-batch3.js
//   node scripts/gen-speaking-part2-batch3-sql.js
//   docker exec -i aptis-mysql mysql -uaptis -paptis --default-character-set=utf8mb4 aptis < scripts/seed-speaking-part2-batch3.sql
//   docker exec -i aptis-mysql mysql -uaptis -paptis --default-character-set=utf8mb4 aptis < scripts/speaking-part2-batch3-assets.sql
//
// 15 đề, KHÔNG PHẢI 17: hai chủ đề trong ảnh gốc bị bỏ theo yêu cầu vì trùng
// với đề đã có ở lô trước — "nấu ăn cùng người khác" (trùng lô 1 đề nấu ăn) và
// "chuyến đi bằng xe hơi" (trùng lô 2 đề đi xe hơi). Thư mục cũng chỉ còn đúng
// 15 ảnh chưa dùng.
//
// Ảnh dùng LÔ MỚI, không lấy lại ảnh của lô 1 (a5/e5) và lô 2 (a6/e6).
// Prefix lô này: a7/e7.
//
// Ảnh phỏng vấn truyền hình đã được cắt 5% đáy để bỏ watermark "Hỏi ChatGPT".

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
    topic: 'Thành phố đông đúc',
    image: 'Đám đông đi qua đường.jpg',
    hot: 4,
    year: null,
    questions: [
      ['Describe the picture?',
        'This picture is taken from high above and shows an enormous pedestrian crossing in a city, probably in Japan because I can see Japanese writing on the buses. Hundreds of people are crossing in several directions at once over the white stripes. In the top right corner there are three or four buses waiting at the lights. On the left there is a paved area, also full of people, and a large green tree.'],
      ['What do you think about living in a crowded city?',
        'It has clear advantages: everything is close, there is work, and you can eat at midnight if you want to. But the cost is real. I live in Hanoi and the noise and air quality genuinely affect how I feel, particularly in the dry season. If I could work remotely I would probably move somewhere smaller, although I would miss the convenience within about a month.'],
      ['Why do many people hate crowded places?',
        'Mostly because crowds take energy without giving anything back. You cannot walk at your own speed, you queue for everything, and there is constant noise you did not choose. I also think it is about control: in a crowd you cannot decide anything, you just move with everyone else. Some people find that genuinely stressful rather than merely annoying, and I understand why.'],
    ],
  },
  {
    topic: 'Nhảy múa',
    image: 'Người đàn ông nhảy múa.jpg',
    hot: 3,
    year: null,
    questions: [
      ['Describe the picture?',
        'In this picture I can see the lower half of a dancer against a plain olive-green background. The person is wearing a dark velvet jacket and loose black trousers, with black dance shoes. One leg is stretched far out to the side and the other is bent, so they are clearly in the middle of a movement. One arm reaches out with the fingers pointing gracefully downwards. The face is not visible at all.'],
      ['Do you like dancing? Why? Why not?',
        'Honestly, not really, although I enjoy watching it. I feel extremely self-conscious about moving in front of other people, and I have no sense of rhythm at all. At weddings I usually find a reason to be somewhere else. Having said that, I did enjoy a salsa class a friend dragged me to, mainly because everybody there was equally bad.'],
      ['On what occasions do people usually dance in your country?',
        'Weddings are the main one, particularly at the evening party rather than the ceremony. There is also a lot of dancing at company year-end events, which is almost compulsory. In parks early in the morning you see groups of older people doing line dancing to loud music, which is a very Vietnamese sight. Young people mostly dance in clubs. Traditional dance still appears at village festivals too.'],
    ],
  },
  {
    topic: 'Cười nhiều',
    image: 'Nhóm người xem phim tại rạp.jpg',
    hot: 4,
    year: null,
    questions: [
      ['Describe the picture?',
        'In this picture I can see two young women sitting next to each other in a dark cinema, each holding a large red and white striped bucket of popcorn. The woman on the right is eating a piece and looking at the screen with wide eyes. Behind and around them the rows of seats are completely empty, with the seat numbers just visible in the dim blue light.'],
      ['Tell me about a time you laughed a lot.',
        'About two months ago I watched a comedy at the cinema with a friend, and there was one scene where we both laughed so much that people turned round. What made it worse was that she started again every time she looked at me. We were still laughing about it in the taxi home. I could not tell you the plot now, only that.'],
      ['Do you think people from different countries laugh at different things?',
        'Yes, quite noticeably. Humour depends on language, so puns and wordplay almost never survive translation. Beyond that, what is acceptable to joke about varies: British comedy is often self-mocking, which some cultures find strange. In Vietnam a lot of humour comes from family situations everyone recognises. Physical comedy, though, seems to work everywhere without any explanation. A person falling over is apparently funny in every language.'],
    ],
  },
  {
    topic: 'Trang trí phòng',
    image: 'Trang trí nhà (2026).png',
    hot: 4,
    year: 2026,
    questions: [
      ['Describe the picture.',
        'In this picture I can see a man and a woman hanging pictures on a cream wall above a green sofa. The man on the left, in a rust-coloured jumper and jeans, is holding a framed print of some plants against the wall, and the woman on the right is pointing to show him where it should go. Around them there are already four other framed pictures, a shelf with plants, and a bright window.'],
      ['Tell me about a time you decorated your room. What did you change?',
        'Last year I repainted my bedroom from white to a pale grey-green, which took a whole weekend and far more paint than I expected. I also moved the bed to face the window and put up two shelves for books. The biggest change was throwing away things I had kept for no reason. The room feels twice as large now, although it is the same size.'],
      ['Why do people like decorating their homes with photos or paintings?',
        'Partly because a blank wall feels unfinished, but I think the real reason is that pictures make a rented space feel like yours. Photographs in particular are a way of keeping people close when they live far away. My grandmother has a whole wall of family photographs, and she tells you about each one whether you asked or not. I find that quite touching, actually.'],
    ],
  },
  {
    topic: 'Dùng điện thoại',
    image: 'Sử dụng điện thoại (2026).png',
    hot: 5,
    year: 2026,
    questions: [
      ['Describe the picture.',
        'In this picture I can see a young woman sitting at a wooden table by a large window in a café. She is holding a black smartphone up in front of her face and waving with her other hand, so she is clearly on a video call. She has dark hair in a bun and is wearing a thick brown jumper. On the table there is a cup of coffee, and behind her there are shelves with plants.'],
      ['Tell me about a time you used your phone to contact someone important.',
        'Last month I had to call my manager while she was on holiday, because a client needed an answer that day and nobody else could decide. I felt bad about it, so I sent a message first to ask if it was a good time. The call took four minutes. It reminded me how much a phone call can save compared with a chain of emails.'],
      ['Why do many people spend a lot of time using their phones?',
        'Because everything is on it now: work, friends, banking, entertainment, even the bus ticket. So the phone is not really one activity you could give up. Beyond that, the applications are deliberately designed to keep you scrolling, and they are extremely good at it. I check my own screen time occasionally and I am always slightly shocked. Four hours a day is normal for me, which I am not proud of.'],
    ],
  },
  {
    topic: 'Gia đình đạp xe',
    image: 'Gia đình cùng nhau đạp xe (2026).jpg',
    hot: 4,
    year: 2026,
    questions: [
      ['Describe the picture.',
        'In this picture I can see three people cycling along a path in a park. On the left there is a woman in a yellow top and a helmet, in the middle a small girl on a little blue bicycle with training wheels, and on the right a man in a grey T-shirt on a black bicycle. All three are wearing helmets. The trees behind them have red and orange leaves, so it is clearly autumn.'],
      ['Why do some families enjoy cycling together?',
        'Because it is one of the few activities that suits every age at once: a small child and a grandparent can both do it. It also costs almost nothing after buying the bicycles. And unlike a walk, cycling covers enough distance to feel like a small trip, so children stay interested. I think the shared effort is part of why it feels good.'],
      ['Do you think children should do more outdoor activities? Why?',
        'Definitely, mainly because most of them now spend the whole day sitting, first at school and then in front of a screen. Being outdoors affects their sleep and their health directly. But I also think outdoor play teaches things a screen cannot: judging risk, negotiating rules, coping when you fall over. Those are difficult to learn indoors alone. A scraped knee teaches a child something a video simply cannot.'],
    ],
  },
  {
    topic: 'Sắp xếp phòng khách',
    image: 'Ba người trao đổi trong buổi phỏng vấn (2026).jpg',
    hot: 3,
    year: 2026,
    questions: [
      ['What are the two people doing in the picture?',
        'In this picture I can see three men sitting at a long wooden table in a meeting room, each reading a sheet of paper. The man in the middle, in a brown checked shirt, is holding his document up and frowning slightly as he reads. On the left there is a man in a grey waistcoat and blue shirt, and on the right a man with long hair and glasses. There is a glass of water and a notebook on the table.'],
      ['Tell me about a meeting you attended at work or school.',
        'A few weeks ago I attended a planning meeting for a new project at work, with about eight people. It was scheduled for one hour and took nearly two, mostly because we spent a long time on a point that could have been settled by email. I did learn what other departments were working on, though, which was genuinely useful to know. That part I would not have got from a written report.'],
      ['What makes a meeting useful rather than a waste of time?',
        'Having a clear purpose written down beforehand, so everybody knows what has to be decided. Beyond that, keeping the number of people small: in a room of twenty nobody speaks honestly. And somebody has to end it. The best manager I worked with always stopped the meeting at the agreed time even if we had not finished everything, and we simply scheduled the rest.'],
    ],
  },
  {
    topic: 'Yêu thích động vật',
    image: 'Người lớn và trẻ nhỏ cưỡi ngựa.png',
    hot: 3,
    year: null,
    questions: [
      ['What can you see in the picture?',
        'In this picture I can see a woman and a small boy sitting together on a brown horse. The woman is wearing a dark hat, a maroon top and sandals, and she is holding the boy in front of her with both arms. The boy is in a white shirt and blue shorts and looks slightly nervous. Behind them there is an old wooden building with a tiled roof and sandy ground.'],
      ['What kind of animals do you enjoy being around?',
        'Dogs, mostly, and I like horses although I have almost no experience with them. What I enjoy about dogs is that they are completely honest about how they feel, which is restful compared with people. I am less comfortable around cats, oddly, because I never know what they want. Birds in cages make me uncomfortable, because it seems unfair to keep something that is built to fly. Birds in cages make me uncomfortable.'],
      ['Why do you think animals are useful to humans?',
        'In practical terms we still depend on them enormously: for food, and in the countryside for work in the fields. But the part I find more interesting is companionship. For elderly people living alone, a dog or a cat is often the main reason they leave the house and the main thing they talk to during the day. That is not a small thing at all.'],
    ],
  },
  {
    topic: 'Tin tức báo in và TV',
    image: 'Phỏng vấn truyền hình ngoài trời - da cat watermark (2026).png',
    hot: 4,
    year: 2026,
    questions: [
      ['What is happening in the picture?',
        'In this picture a woman is being interviewed outdoors, in what looks like a business district with tall glass office buildings. She is in the middle wearing a navy blazer and a cream blouse, smiling as she speaks. On the left a man in a grey suit is holding a black microphone towards her, and on the right a cameraman with headphones is filming them on a large video camera.'],
      ['Which do you enjoy more: getting news from printed papers or from television?',
        'Neither, if I am honest — I read almost everything online. But between those two I would choose print, because you control the order and can stop whenever you like. Television decides for you and adds music and pictures that make everything feel more dramatic than it is. My father would disagree completely; he trusts the evening broadcast above anything.'],
      ['Why is it important for people to keep up with current events?',
        'Because a lot of news affects daily life directly: new regulations, prices, transport, health warnings. Beyond that, it is difficult to have any opinion about how your country is run if you do not know what has happened. I would add one condition, though: reading the news constantly makes people anxious without making them better informed. Once a day is enough, in my opinion.'],
    ],
  },
  {
    topic: 'Đi bộ trong rừng',
    image: 'Nature - walking in a forest.jpg',
    hot: 4,
    year: null,
    questions: [
      ['Describe the picture.',
        'In this picture I can see two people walking away from the camera along a narrow stone path through a forest. Both have their backs to us and are carrying backpacks; the person on the left wears a denim jacket and the one on the right a dark coat with a grey rucksack. Tall thin trees rise on both sides and there is bright sunlight ahead, so the path seems to lead out of the forest.'],
      ['Why do some people enjoy walking in a forest?',
        'Mainly because it is quiet in a way a city never is, and the temperature is noticeably cooler. Walking in a forest also requires just enough attention that you stop thinking about work. I did a two-hour forest walk in Sapa last year and I remember it far better than any afternoon spent resting at home. The air alone was worth the journey.'],
      ['Do you think people should spend more time in nature? Why?',
        'Yes, and I think most of us know it without doing anything about it. Living in a city means artificial light, noise and screens all day, and a few hours outside genuinely changes how I sleep. It does not have to be dramatic. A park at the weekend is enough; the problem is that it is always the first thing we cancel.'],
    ],
  },
  {
    topic: 'Xếp hàng chờ đợi',
    image: 'Queuing at a ticket office.jpg',
    hot: 3,
    year: null,
    questions: [
      ['Describe the picture.',
        'In this picture I can see about ten people queuing at a ticket office in what looks like a metro or railway station. The counters are bright orange and the signs say "Ticket Office" in English and Russian. Most of the people have their backs to the camera, carrying bags and briefcases. On the left there are ticket machines that nobody is using, which is slightly ironic.'],
      ['Tell me about a time when you had to wait in a long queue.',
        'Last year I queued for nearly two hours at an administrative office to get a document stamped. There was no clear system, so people kept arriving and standing wherever they liked. What made it worse was that the counter closed for lunch while I was waiting. I finished the whole thing in four minutes once I reached the front. Two hours of waiting for four minutes of work is genuinely infuriating.'],
      ['What can places such as stations, banks or hospitals do to reduce waiting time?',
        'The most effective thing is letting people book a time slot online, so they do not all arrive at once. A numbered ticket system also helps, because at least you can sit down. And honestly, opening more counters at peak hours. In my experience the queue is rarely a staffing problem in total, only a scheduling one. The same staff spread across the day would fix most of it.'],
    ],
  },
  {
    topic: 'Đồ chơi trẻ em',
    image: 'Drawing together.jpg',
    hot: 3,
    year: null,
    questions: [
      ['Describe the picture.',
        'In this picture I can see two young women sitting on a wooden floor in a bright room, drawing together. The one on the left is in a white T-shirt and black jeans, leaning forward on her hands and looking down at the paper. The other, on the right in a black hoodie, is holding a pencil and drawing. Around them there are several large sheets of paper and coloured markers scattered on the floor.'],
      ['What toys or games did you enjoy when you were a child?',
        'I did not have many toys, so most of what I remember is drawing and making things out of paper and cardboard. I also played a lot of street games with the neighbours, which needed no equipment at all. The one real toy I remember was a set of building blocks from my uncle, which I kept for years. I still have a few of the pieces somewhere at my parents\' house.'],
      ['Why is play important for young children?',
        'Because it is how they learn almost everything at that age: sharing, waiting their turn, and solving small problems without an adult telling them the answer. Play also builds language quickly, especially when they play with other children rather than alone. And I think it matters simply because children who play enough are noticeably happier. You can see the difference in a classroom immediately.'],
    ],
  },
  {
    topic: 'Hoạt động sáng tạo',
    image: 'Người mẹ đọc sách cùng con gái.jpg',
    hot: 3,
    year: null,
    questions: [
      ['Describe the picture.',
        'In this picture I can see a woman and two young girls playing chess at a low wooden table in a dimly lit room. The woman in the middle, wearing an orange jumper, is holding a piece and explaining something. The girl on the left in a grey top is reaching towards the board, and the girl on the right in a pale dress is holding a white piece. In the background another woman is standing by a table.'],
      ['Tell me about a time when you did a creative activity with other people.',
        'A few months ago some colleagues and I had to design a poster for a company event, and none of us was a designer. We spent an evening arguing about colours and ended up with something surprisingly good. What I enjoyed was that nobody was the expert, so everybody suggested things freely. It felt completely different from a normal work task. I would happily do more of that kind of work, honestly.'],
      ['Why can drawing or making art be useful for children?',
        'Because there is no correct answer, which is rare in a child\'s day. Everything else they do is marked, but a drawing simply is what it is. It also develops patience and fine motor control, and it gives them a way to express something before they have the words for it. My niece draws when she is upset, and it clearly helps.'],
    ],
  },
  {
    topic: 'Học nhóm',
    image: 'Học nhóm - học cùng người khác (2026).png',
    hot: 5,
    year: 2026,
    questions: [
      ['Describe the picture.',
        'In this picture I can see six students sitting around a large wooden table in a library, studying together. There are open textbooks in front of each of them, a silver laptop in the middle, and a takeaway coffee cup on the left. They are all smiling and looking towards the laptop, so someone has just said something amusing. Behind them there are tall bookshelves and a large window.'],
      ['Do you prefer studying alone or studying in a group? Why?',
        'It depends on the subject. For anything I need to memorise I have to be alone, because a group is simply too distracting. But for understanding a difficult idea a group is far better, since explaining it to somebody else shows you immediately what you do not know. Ideally I would do both, and I try to: alone first to read the material, then with others to check I understood it properly.'],
      ['How can studying with other people help students learn better?',
        'The main thing is that you have to put ideas into words, and that reveals the gaps. When I helped a classmate with statistics I learned more than he did. A group also keeps you working: it is much harder to give up at nine o\'clock when four other people are still sitting there. And you notice methods you would never have tried.'],
    ],
  },
  {
    topic: 'Đi xe buýt',
    image: 'Hai người phụ nữ ngồi trên xe buýt.jpg',
    hot: 3,
    year: null,
    questions: [
      ['Describe the picture.',
        'This picture is taken inside a city bus, looking towards the front. On the right a woman in a straw hat, a face mask and a navy top is sitting on a blue seat, holding a black bag and looking down at her hands. In front of her, through the windscreen, I can see a tree-lined street with several motorbikes. There is a notice with regulations on the left, in Vietnamese.'],
      ['Tell me about the last time you used public transport',
        'This morning, actually — I take the bus to work almost every day. The journey is about thirty-five minutes and it was crowded, so I stood for most of it. I got a seat for the last ten minutes, which felt like a small victory. I usually listen to a podcast, so I do not mind, and it is far less stressful than driving a motorbike in that traffic before work has even started.'],
      ['Why are cafes popular places for people to meet and talk?',
        'Because they are one of the few places you can sit for two hours without needing a reason. A café is neutral ground too, which matters: it is easier than inviting somebody to your home. In Vietnam they are also extremely cheap, so meeting for coffee costs almost nothing and is genuinely the default way to see a friend. Nobody here says "let us meet" without meaning coffee.'],
    ],
  },
];

if (TOPICS.length !== 15) {
  throw new Error('Kỳ vọng 15 đề, thực tế ' + TOPICS.length);
}

/** Prefix a7 — a2 là Reading P2, a5 lô 1, a6 lô 2. */
const idOf = (index) => 'a7000000-0000-4000-8000-' + String(index + 1).padStart(12, '0');

let upserted = 0;

TOPICS.forEach((entry, index) => {
  if (entry.questions.length !== 3) {
    throw new Error('Đề ' + (index + 1) + ' phải có đúng 3 câu');
  }

  const id = idOf(index);
  const assetId = 'e7000000-0000-4000-8000-' + String(index + 1).padStart(12, '0');
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

print('Da upsert ' + upserted + ' de Speaking Part 2 lo 3');
print('Tong de Part 2 trong Mongo = ' +
  target.question_set_documents.countDocuments({ partId: PART_ID }));
