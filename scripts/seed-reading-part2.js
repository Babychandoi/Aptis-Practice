// Seed 20 bộ Reading Part 2 (sắp xếp câu) vào MongoDB + MySQL.
//
// Chạy:
//   docker exec -i aptis-mongo mongosh --quiet < scripts/seed-reading-part2.js
//   docker exec -i aptis-mysql mysql -uaptis -paptis aptis < scripts/seed-reading-part2.sql
//
// Mỗi bộ: 1 item, 5 câu, TẤT CẢ đều phải sắp xếp và đều được chấm (5đ, 1đ/câu).
//
// Đề Aptis thật có 6 câu với câu đầu cho sẵn làm mẫu; dữ liệu này chỉ có 5 câu
// nên KHÔNG dùng constraints.fixedFirstOptionId — đặt nó sẽ khoá câu 1 và chỉ
// chấm 4 câu, không khớp part_scoring_rules (Part 2 = 5đ mỗi bộ).
//
// shuffleOptions bật để học viên không thấy sẵn thứ tự đúng.

const target = db.getSiblingDB('aptis');

const PART_ID = '16000000-0000-4000-8000-000000000012'; // Reading Part 2
const TASK_TYPE = 'SENTENCE_ORDERING';

// 20 đề, thứ tự trong mảng sentences CHÍNH LÀ thứ tự đúng.
const SETS = [
  {
    n: 1,
    topic: 'Films',
    sentences: [
      'Old movies were very different from today’s movies.',
      'That’s because the movies were only in black and white, and sometimes without sound.',
      'Not only did these technological limitations exist, the movies were also low budget.',
      'Due to the lack of money, actors also had few opportunities to earn money through acting.',
      'Now things have changed, actors and filmmakers can earn thousands of dollars from film production.',
    ],
  },
  {
    n: 2,
    topic: 'Weekend activities',
    sentences: [
      'It was held on Saturday morning, there was a 10 km race for adults.',
      'There were 60 participants, in which Ms. Kamus kept the fastest speed and won.',
      'After she received the prize, the following time was for children’s activities.',
      'Activities including football, swimming, skipping rope, and the children played together very happily.',
      'After playing, the children were very hungry and ate with their parents.',
    ],
  },
  {
    n: 3,
    topic: 'The famous singer',
    sentences: [
      'He is a famous singer who is loved by many fans.',
      'At the age of fifteen, he studied music at a special school.',
      'Before becoming famous, he had to practice very hard every day.',
      'With his unique style and clothes, he soon attracted attention.',
      'Thanks to his talent and personality, he became well-known to a large audience.',
    ],
  },
  {
    n: 4,
    topic: 'Family sports day',
    sentences: [
      'It took place on Sunday morning in the park, there was a race for adults.',
      'Sixty people took part, and among them, Ms Kamus kept the fastest pace and won the race.',
      'After she got her prize, the next part was for children’s activities.',
      'The activities were football, swimming, skipping, and more, and the kids had fun playing together.',
      'After the games, the kids were really hungry and ate with their parents.',
    ],
  },
  {
    n: 5,
    topic: 'Writing about a place',
    sentences: [
      'Before writing about a place, you need to do some research on it.',
      'It is important to learn about the people and the history there carefully.',
      'Even if you can not visit the place, your writing will still look similar to real experiences.',
      'You should also compare that place with your own country.',
      'Such comparisons will make your writing more interesting and meaningful.',
    ],
  },
  {
    n: 6,
    topic: 'Movies then and now',
    sentences: [
      'Movies today are very different from movies in the past.',
      'In the old days, films were only in black and white, and sometimes even without sound.',
      'In addition to these technological limits, producers had very low budgets.',
      'Because of the lack of money, actors also earn little money from acting.',
      'Nowadays, everything has changed: actors and producers can earn a lot of money from producing films.',
    ],
  },
  {
    n: 7,
    topic: 'The history of transportation',
    sentences: [
      'In the past, transportation was primarily accessible to the wealthy.',
      'Later, air travel became popular among business professionals.',
      'Eventually, buses and trains were introduced as affordable alternatives.',
      'These made traveling more accessible to everyone.',
      'Today, buses and trains are among the most common transportation options.',
    ],
  },
  {
    n: 8,
    topic: 'New coffee shop',
    sentences: [
      'I arrived at the shop early in the morning, but it was crowded with people.',
      'A waiter assisted me in finding a table and handed me the menu.',
      'The menu was not as good as expected and quite pricey, so I decided to order a sandwich.',
      'The sandwich was both delicious and beautifully presented.',
      'I might return to try different types of drinks next time.',
    ],
  },
  {
    n: 9,
    topic: 'Artificial intelligence',
    sentences: [
      'Over the past decade, artificial intelligence has revolutionized various industries.',
      'The early AI systems were limited to simple pattern recognition tasks.',
      'High computational costs previously hindered the development of AI.',
      'Nowadays, AI engineers build advanced models for complex tasks such as language translation.',
      'Modern AI tools help businesses to analyze data and make better decisions.',
    ],
  },
  {
    n: 10,
    topic: 'Company wellness day',
    sentences: [
      'This month, the wellness day took place on Friday, focusing on work-life balance.',
      'More than 50 employees participated, with Mr. Anderson leading a workshop on stress relief.',
      'Activities included team yoga, time management seminars, and a group walk.',
      'After the workshops, awards were given for the most creative wellness ideas.',
      'Employees enjoyed healthy snacks and exchanged tips for managing stress.',
    ],
  },
  {
    n: 11,
    topic: 'Workplace evolution',
    sentences: [
      'Flexible work models are becoming more common in modern workplaces.',
      'Previously, employees were confined to rigid nine-to-five work hours.',
      'Technological restrictions once made remote work a challenge.',
      'Managers now utilize software to monitor project progress remotely.',
      'Today, businesses are exploring shorter workweeks to boost productivity.',
    ],
  },
  {
    n: 12,
    topic: 'Music show at the park',
    sentences: [
      'The event was fully planned, financed, and supported by local authorities.',
      'As a result, entry was free, and around five thousand people attended.',
      'Many attendees arrived early and browsed local shops before the event began.',
      'Despite the busy day, workers finished ahead of schedule and watched the famous singer perform.',
      'The two-hour performance thrilled the audience, leaving everyone in high spirits.',
    ],
  },
  {
    n: 13,
    topic: 'Mae - The Math Girl',
    sentences: [
      'Mae’s father worked as a nurse, and her mother was a teacher.',
      'Her parents motivated Mae to pursue higher education and focus on scientific studies.',
      'Mae worked diligently and achieved several remarkable milestones.',
      'She later joined a team, contributing her skills and knowledge.',
      'Eventually, she had the opportunity to undergo a training program in the United States.',
    ],
  },
  {
    n: 14,
    topic: 'IoT - Internet of Things',
    sentences: [
      'The Internet of Things (IoT) links everyday devices to improve their capabilities.',
      'Early IoT devices faced limitations due to slow internet speeds and compatibility challenges.',
      'High development costs previously slowed the widespread adoption of IoT technology.',
      'Nowadays, engineers create smart devices for both residential and industrial applications.',
      'Modern IoT systems provide real-time data tracking and automation features.',
    ],
  },
  {
    n: 15,
    topic: 'Eating at restaurant',
    sentences: [
      'I decided to try a new café located at the end of the street.',
      'The place was quite busy, with a lively atmosphere.',
      'Even so, a staff member quickly noticed me and brought over the menu.',
      'I was a bit surprised to see that there were only a few items to choose from.',
      'In the end, I went for the most expensive salad on the menu.',
    ],
  },
  {
    n: 16,
    topic: 'A group presentation',
    sentences: [
      'First, we prepared the materials for our group presentation.',
      'Then, we presented our topic for 10 minutes.',
      'Throughout the presentation, we used images to explain our ideas.',
      'After the presentation, other students asked questions.',
      'Finally, each group member took turns answering the questions.',
    ],
  },
  {
    n: 17,
    topic: 'Workplace evolution (phiên bản 2)',
    sentences: [
      'In the past, most workers followed fixed schedules from nine to five.',
      'Because technology was limited, working from home was almost impossible.',
      'Modern offices are now moving toward more flexible ways of working.',
      'Managers now use digital tools to follow project progress remotely.',
      'Many companies today are trying shorter workweeks to increase efficiency.',
    ],
  },
  {
    n: 18,
    topic: 'The first american woman in space',
    sentences: [
      'Encouraged by her parents, she decided to study science at university.',
      'Her strong academic record earned her a place in a training program in the United States.',
      'Her passion for space led Mae to join a dedicated research team.',
      'As a member of the team, she traveled into space and carried out numerous experiments.',
      'Some of these experiments involved growing plants and observing animals aboard the spacecraft.',
    ],
  },
  {
    n: 19,
    topic: 'Social Media',
    sentences: [
      'In the past, slow internet speeds made streaming or uploading videos difficult.',
      'Early platforms offered only basic features like text posts and simple images.',
      'Over time, social media platforms have greatly evolved in both design and functionality.',
      'Today’s platforms use complex algorithms to personalize and shape each user’s feed.',
      'Many influencers now earn income primarily through brand sponsorships and online ads.',
    ],
  },
  {
    n: 20,
    topic: 'University open day',
    sentences: [
      'Before the open day, please contact us by phone or email so we can record your personal details.',
      'Using this information, we’ll prepare an identification card for you to collect upon arrival.',
      'You’ll need to show this card to enter the introductory talk and morning lectures.',
      'Every visitor will have the chance to join a Q&A session with current students.',
      'After the presentations, you’ll be able to explore different departments across the campus.',
    ],
  },
  {
    n: 21,
    topic: 'AI - Artificial Intelligence',
    sentences: [
      'Over the past decade, artificial intelligence has reshaped industries around the world.',
      'Early AI systems were capable of handling only simple pattern recognition tasks.',
      'In the past, high computational costs slowed down the progress of AI development.',
      'Today, AI engineers design sophisticated models for applications such as language translation.',
      'Modern AI tools enable businesses to analyze vast amounts of data and make smarter decisions.',
    ],
  },
  {
    n: 22,
    topic: 'Healthy Eating',
    sentences: [
      'In the past, many meals were high in sugar and unhealthy fats.',
      'Years ago, limited access to fresh produce made healthy eating more difficult.',
      'Modern diets now focus on fresh, whole foods instead of processed ones.',
      'Nutritionists today teach people how to plan balanced and nutritious meals.',
      'Nowadays, mobile apps help users track calories and discover healthy recipes.',
    ],
  },
  {
    n: 23,
    topic: 'Wellness Fair',
    sentences: [
      'The wellness fair took place on Saturday afternoon, encouraging people to adopt healthier lifestyles.',
      'More than 60 participants joined the event, with Dr. Bennett leading an engaging fitness workshop.',
      'The fair also included activities like cooking demonstrations, mindfulness sessions, and a fun run.',
      'After the workshops, prizes were awarded to participants who created the most creative health posters.',
      'Families enjoyed tasting healthy snacks and discovering practical tips for better overall wellness.',
    ],
  },
  {
    n: 24,
    topic: 'The famous singer (phiên bản 2)',
    sentences: [
      'He is a famous singer.',
      'Before becoming famous, he studied music at school when he was 15.',
      'His unique way of dressing and performing made him stand out from others.',
      'This helped him receive many invitations for collaborations and performances.',
      'He eventually became famous among audiences around the world.',
    ],
  },
  {
    n: 25,
    topic: 'The famous singer (phiên bản 3)',
    sentences: [
      'He is a famous singer who is loved by many people.',
      'Before becoming famous, he studied music at school when he was 15 years old.',
      'He spent years practicing and improving his performance skills.',
      'His unique clothing style and stage presence made him stand out.',
      'Because of this, more and more people began to recognize and admire him.',
    ],
  },
  {
    n: 26,
    topic: 'Writing about a place (phiên bản 2)',
    sentences: [
      'Before writing, it is important to research the place thoroughly.',
      'To prepare well, you should learn about the people and the history of the area.',
      'Sometimes you may not be able to visit the place, but you can still find similar information from other sources.',
      'Comparing that place with your own country can be very helpful.',
      'This comparison will help you gain a deeper understanding and write more effectively.',
    ],
  },
  {
    n: 27,
    topic: 'Busy coffee shop',
    sentences: [
      'The café was very crowded when the customer arrived.',
      'The staff helped them find a table and handed them a menu.',
      'The customer was surprised because the menu was different from what they had expected.',
      'They decided to order the most expensive item — a sandwich.',
      'The customer said the sandwich was delicious and that they would definitely come back again.',
    ],
  },
  {
    n: 28,
    topic: 'My visit to a new coffee shop',
    sentences: [
      'It was my first time visiting a new local coffee shop.',
      'At first, I didn’t think it would be good, but I decided to give it a try.',
      'I looked at the menu and saw many different kinds of food and drinks.',
      'I chose one dish to try for myself.',
      'When I tasted it, I found it really delicious and knew I would come back again.',
    ],
  },
  {
    n: 29,
    topic: 'Work',
    sentences: [
      'The company offers flexible working hours to better support employees’ schedules.',
      'Her white desk stands out in the shared open office.',
      'She uses a planner to organize her tasks throughout the shorter workweek.',
      'At lunchtime, she enjoys a homemade sandwich prepared with fresh ingredients.',
      'In the evenings, they unwind by reading books on productivity and well-being.',
    ],
  },
  {
    n: 30,
    topic: 'Cultural festival',
    sentences: [
      'The cultural fair was held on Sunday, celebrating and showcasing local traditions.',
      'About 60 participants took part, with Ms. Alvarez leading a traditional dance group.',
      'The event featured pottery workshops, folk music performances, and food tastings.',
      'Families enjoyed taking photos and sharing delicious local dishes together.',
      'At the end of the event, prizes were given to participants with the best costumes.',
    ],
  },
  {
    n: 31,
    topic: 'Public Transportations',
    sentences: [
      'In the past, many cities had fewer bus routes because of budget limitations.',
      'Older buses often didn’t have air conditioning or comfortable seating.',
      'City buses today are much more efficient than those from ten years ago.',
      'Drivers and staff now receive better training to provide improved passenger service.',
      'Modern buses often use electric power, helping to reduce pollution in urban areas.',
    ],
  },
  {
    n: 32,
    topic: 'Tourism',
    sentences: [
      'Modern tourism now provides far more choices than in the past.',
      'In earlier times, travelers mostly depended on guidebooks and paper maps.',
      'Back then, limited technology also meant that booking options were quite restricted.',
      'Today, online platforms allow people to plan thoroughly and book their trips with ease.',
      'Moreover, local guides now offer personalized tours that give visitors more authentic experiences.',
    ],
  },
  {
    n: 33,
    topic: 'New coffee shop (phiên bản 2)',
    sentences: [
      'When I arrived, the place was very crowded, and the staff were extremely busy on the first day.',
      'Even though it was crowded, the staff still managed to find a table for me.',
      'They handed me the menu, and when I looked through it, I saw quite a variety of dishes.',
      'After checking them all, I decided to order the most expensive sandwich.',
      'It tasted really good with melted cheese on top, and I’ll definitely come back to this place again.',
    ],
  },
  {
    n: 34,
    topic: 'Healthy eating (phiên bản 2)',
    sentences: [
      'In the past, many meals were high in sugar and unhealthy fats.',
      'Years ago, limited access to fresh produce made healthy eating much more challenging.',
      'Modern diets now emphasize fresh, whole foods instead of processed ones.',
      'Nutritionists today teach people how to create balanced and nutritious meal plans.',
      'Nowadays, mobile apps help users track calories and discover healthy recipes to support better lifestyles.',
    ],
  },
  {
    n: 35,
    topic: 'Tech fair',
    sentences: [
      'The tech fair took place on Saturday morning, showcasing a variety of exciting new gadgets.',
      'More than 60 exhibitors participated, with Mr. Carter presenting an impressive robot demonstration.',
      'The event featured engaging activities such as VR gaming, coding workshops, and thrilling drone races.',
      'After the demonstrations, awards were given to the creators of the most innovative products.',
      'Visitors enjoyed complimentary coffee and snacks while exploring the interactive exhibits.',
    ],
  },
  {
    n: 36,
    topic: 'End of term project',
    sentences: [
      'Your end-of-term project should focus on at least two of the given topics.',
      'It must include relevant pictures along with your own written text about the subject.',
      'You will then use these pictures and your written work to create a class presentation.',
      'During the presentation, you should summarize your main points, and it should last about five minutes.',
      'Afterward, your classmates will have the opportunity to ask questions, and you will respond to them.',
    ],
  },
  {
    n: 37,
    topic: 'College Welcoming Day',
    sentences: [
      'Today will begin at 10 a.m. with a short presentation.',
      'At the end of the presentation, you will meet the heads of departments and lecturers.',
      'These staff members will take you on a tour of the school’s buildings and sports facilities in small groups.',
      'During this tour, you will need to stay with these students until lunchtime.',
      'This meal will be provided on the second floor of the engineering building.',
    ],
  },
  {
    n: 38,
    topic: 'The history of transportation (phiên bản 2)',
    sentences: [
      'In the past, traveling was something only wealthy people could afford.',
      'The development of trains and cars made travel more convenient and affordable for the general public.',
      'Later on, airplanes also helped make traveling easier and more accessible.',
      'Because flying is very fast, it supports travel for both holidays and business purposes.',
      'Today, improvements in transportation make it easier to travel to many parts of the world.',
    ],
  },
  {
    n: 39,
    topic: 'The famous singer (phiên bản 4)',
    sentences: [
      'Before becoming famous at a young age, he studied art and music in high school.',
      'During this time, he started performing on stage.',
      'During his performances on stage, he liked wearing colorful clothes and painting his face.',
      'This unusual way of dressing and his songs attracted people’s attention.',
      'They then started following him on social media, and he is now very famous.',
    ],
  },
];

/** UUID tiền định để chạy lại script không sinh bản ghi trùng. */
function idOf(n) {
  return 'a2000000-0000-4000-8000-' + String(n).padStart(12, '0');
}

function buildDoc(set) {
  const id = idOf(set.n);

  // optionId theo thứ tự đúng: s1..s5. Thứ tự hiển thị do sanitizer trộn.
  const options = set.sentences.map((text, i) => ({
    id: 's' + (i + 1),
    code: String.fromCharCode(65 + i),
    content: text,
  }));

  const orderedOptionIds = options.map((o) => o.id);

  const item = {
    id: 'item_1',
    sequenceNo: NumberInt(1),
    // Bỏ trống: chủ đề đã nằm ở stimulus của cả bộ, đặt vào đây nữa thì
    // giao diện hiện "Topic: ..." hai lần.
    prompt: null,
    responseType: 'ORDERING',
    required: true,
    maxScore: 5,
    options: options,
    leftItems: [],
    rightItems: [],
    constraints: {
      // KHÔNG đặt fixedFirstOptionId: đề Aptis thật có 6 câu và câu đầu là câu
      // mẫu cho sẵn, nhưng dữ liệu này chỉ có 5 câu nên cả 5 đều phải sắp xếp
      // và đều được chấm.
      pointsPerCorrect: 1,
    },
    rubricCode: null,
    answerKey: {
      type: 'ORDERING',
      selectedOptionId: null,
      selectedOptionIds: [],
      matches: {},
      orderedOptionIds: orderedOptionIds,
      acceptedValues: [],
      caseSensitive: false,
    },
    explanation: null,
  };

  return {
    _id: id,
    questionSetId: id,
    revision: NumberInt(1),
    schemaVersion: NumberInt(1),
    partId: PART_ID,
    taskTypeCode: TASK_TYPE,
    // Tên đề tài, không phải số thứ tự: học viên cần biết bài nói về gì.
    title: set.topic,
    // Không nói "câu đầu đã làm mẫu": bộ này 5 câu, cả 5 đều phải sắp xếp.
    instructions: 'Sắp xếp các câu theo thứ tự đúng để tạo thành một đoạn văn hoàn chỉnh.',
    accessLevel: 'FREE',
    stimulus: {
      type: 'TEXT',
      format: 'PLAIN_TEXT',
      value: 'Topic: ' + set.topic,
    },
    sections: [],
    items: [item],
    assets: [],
    settings: {
      // Bắt buộc: không trộn thì options trả về đúng thứ tự đáp án.
      shuffleOptions: true,
      shuffleItems: false,
      maxAudioPlays: null,
      showAnswerAfterEachItem: false,
      allowReview: true,
    },
    scoring: {
      strategy: 'EXACT_MATCH',
      partialCredit: true,
      maxScore: 5,
    },
    createdAt: new Date(),
    updatedAt: new Date(),
  };
}

let count = 0;
SETS.forEach(function (set) {
  const doc = buildDoc(set);
  target.question_set_documents.replaceOne({ _id: doc._id }, doc, { upsert: true });
  count++;
  print('upserted ' + doc._id + '  ' + doc.title + '  (' + set.topic + ')');
});

print('---');
print('Đã ghi ' + count + ' bộ Reading Part 2.');
print('Tổng document Part 2 = ' + target.question_set_documents.countDocuments({ partId: PART_ID }));
