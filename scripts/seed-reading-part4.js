// Seed 11 bộ Reading Part 4 (ghép tiêu đề với đoạn văn) vào MongoDB.
//
// Chạy:
//   docker exec -i aptis-mongo mongosh --quiet < scripts/seed-reading-part4.js
//   docker exec -i aptis-mysql mysql -uaptis -paptis aptis < scripts/seed-reading-part4.sql
//
// Mỗi bộ: 1 item MATCHING, 7 đoạn văn (leftItems) ghép với 7 tiêu đề (rightItems).
// 2đ/đoạn đúng = 14đ, khớp part_scoring_rules của Part 4 (không có perfect bonus).
//
// Đáp án theo thứ tự: tiêu đề thứ N ứng với đoạn thứ N (đã xác nhận với user,
// khớp phần "Mẹo nhớ Keyword" trong tài liệu nguồn).
//
// shuffleOptions BẬT: tiêu đề trong nguồn xếp đúng thứ tự đoạn, không trộn thì
// học viên chỉ cần chọn lần lượt là đúng hết. Sanitizer trộn rightItems theo seed
// của attempt nên mỗi lượt có thứ tự khác nhau nhưng ổn định khi tải lại trang.
//
// Ba đề 4.7, 4.8, 4.9 trong nguồn chỉ có placeholder thay vì bài đọc thật nên
// để DRAFT (xem seed-reading-part4.sql) — học viên không thấy tới khi có nội dung.

const target = db.getSiblingDB('aptis');

const PART_ID = '16000000-0000-4000-8000-000000000014'; // Reading Part 4
const TASK_TYPE = 'HEADING_MATCHING';

/** Đề chưa có bài đọc: chỉ có tiêu đề, cần biên tập bổ sung trước khi publish. */
const NO_PASSAGE = null;

const SETS = [
  {
    n: 1,
    topic: 'Mountain',
    paragraphs: [
      'The term "mountain" has evolved over time, reflecting not only physical characteristics but also cultural significance. In contemporary discussions, mountains may symbolize challenges to overcome or destinations for adventure, transcending their geographical attributes.',
      'Climbing a mountain often leads to a profound sense of accomplishment. It represents not just reaching a physical summit but also conquering personal fears and pushing one’s limits, creating memories that last a lifetime.',
      'In today’s digital age, sharing achievements has become prevalent. Climbing a mountain is frequently documented on social media, turning personal milestones into public spectacles that inspire others while also raising questions about authenticity.',
      'The pursuit of climbing mountains can sometimes lead to misplaced priorities. While seeking adventure and recognition, individuals may neglect personal relationships or responsibilities, emphasizing the need for a balanced approach to life.',
      'Engaging in extreme sports, such as mountain climbing, can forge strong bonds among participants. However, it may also create worrying connections where individuals prioritize adrenaline over safety, potentially leading to dangerous situations.',
      'While adventure is thrilling, there is a growing recognition of the importance of stability in life. Balancing the desire for adventure with the need for security is crucial, prompting individuals to reflect on their life choices and long-term goals.',
      'Shared experiences in challenging environments, like mountains, can deepen intimacy in relationships. Couples or friends who navigate the challenges of climbing together often find their bonds strengthened through mutual support and understanding.',
    ],
    headings: [
      'Changing the definition of mountain',
      'The unique feeling of achievement',
      'Publicity of achievement',
      'The mistake of misplaced priorities',
      'Worrying connections',
      'Focus on stability',
      'Intimate relationships',
    ],
  },
  {
    n: 2,
    topic: 'Four-Day Workweek',
    paragraphs: [
      'For many years, a workweek of five or even six days was the standard. However, advancements in technology, evolving social values, and an increasing emphasis on work-life balance are making this traditional schedule less relevant. Both employees and employers are starting to question whether spending the majority of one’s week at work is truly necessary or productive.',
      'Proponents of a four-day workweek highlight various benefits for workers. With an extra day off, employees gain more time to recharge, connect with family, or explore personal interests. Research shows that shorter workweeks can enhance focus and efficiency, leading to improved job performance and higher levels of job satisfaction.',
      'While appealing, a reduced workweek could have financial downsides. Companies might incur higher expenses from the need to hire additional staff or adjust compensation models. For sectors that rely on hourly employees, it may be difficult to maintain profitability, potentially leading to service reductions or job cuts.',
      'Adapting to a new work schedule can be difficult for some employees. The pressure to complete tasks within a shorter timeframe can lead to stress, and fast-paced industries may face challenges such as missed deadlines or conflicting schedules, complicating the transition to a shorter workweek.',
      'For individuals accustomed to traditional work hours, the shift to a four-day workweek can be challenging. Breaking long-established routines is tough, and some may resist change even when it offers potential benefits. Adapting to a new work pattern often requires time and support.',
      'While a four-day workweek may sound ideal to many, it isn’t necessarily fair to all. Essential workers, healthcare providers, and employees in the hospitality industry may not have the option to reduce their hours. This could create disparities among different worker groups and lead to tension within the workforce.',
      'Rather than universally implementing a four-day workweek, experts suggest considering more flexible arrangements. Options such as allowing employees to choose their days off or offering shorter daily hours can provide similar advantages without disrupting industries that depend on a traditional work schedule.',
    ],
    headings: [
      'A way of life now out of date',
      'Benefits for employees',
      'Undesirable financial consequences',
      'Unforeseen challenges for employees',
      'Difficult to change old habits',
      'Unfair for some people',
      'Alternative solutions worth considering',
    ],
  },
  {
    n: 3,
    topic: 'Digital transformation (Tech Forward)',
    paragraphs: [
      'The interaction between people and technology is continuously evolving. Modern gadgets and software are designed to be more user-friendly, enabling communication through voice commands, gestures, or even facial recognition. This transformation makes technology more intuitive and accessible, enhancing both personal and professional experiences.',
      'Smart automation tools are revolutionizing workplaces by handling repetitive and time-consuming tasks. These technologies, often powered by AI, enable employees to concentrate on more valuable work, boosting efficiency and fostering innovation across various sectors.',
      'Educational institutions are increasingly incorporating technology into their curricula to prepare students for future careers. Programs focused on coding, robotics, and digital literacy provide learners with vital skills for the digital age, promoting creativity and enhancing problem-solving abilities.',
      'Although digital devices offer numerous advantages, over-reliance on screens can lead to negative consequences. Individuals may experience reduced social interactions, trouble concentrating, and higher stress levels. It’s crucial to balance digital engagement with offline activities for maintaining mental and physical well-being.',
      'Not everyone has equal access to technology, which can result in significant social and economic divides. Those without reliable internet or modern devices may miss out on educational and employment opportunities, making it essential to address these inequalities through policies and community-driven efforts.',
      'Tech communities unite individuals passionate about technology to exchange ideas, support projects, and collaborate. These groups encourage innovation and creativity, offering mentorship and resources to help transform new ideas into reality.',
      'As technology continues to evolve, there is a growing focus on sustainability. Companies are developing eco-friendly products and adopting green practices to reduce environmental impact, ensuring that digital advancements contribute to long-term ecological health.',
    ],
    headings: [
      'Redefining business models with technology',
      'Enhancing productivity through automation',
      'Promoting digital skills training',
      'Over-reliance on automated systems',
      'Concerns about cybersecurity risks',
      'Building inclusive digital ecosystems',
      'Focusing on ethical technology development',
    ],
  },
  {
    n: 4,
    topic: 'Wellness trend',
    paragraphs: [
      'In recent years, the definition of health has broadened to encompass more than just physical well-being. Holistic approaches emphasize the interconnection of the body, mind, and environment, encouraging individuals to consider emotional balance, mental clarity, nutrition, and lifestyle habits collectively. This more comprehensive view helps people achieve deeper and more sustainable wellness by addressing various aspects of life rather than isolated symptoms.',
      'Mental health has become a growing priority in public health discussions. Awareness campaigns aim to reduce the stigma surrounding mental health disorders and encourage open conversations about personal struggles. Educating people on recognizing early signs of anxiety, depression, and stress empowers them to seek help sooner. Many organizations also provide support networks and resources to build a more compassionate and understanding society.',
      'Community-based fitness initiatives are becoming more popular as a way to make exercise enjoyable and accessible. By participating in group activities such as yoga, walking clubs, or sports leagues, individuals not only improve their physical health but also form meaningful social connections. These programs foster a sense of belonging and help individuals stay committed to their fitness goals over time, contributing to healthier and happier communities.',
      'Although trendy diets often promise quick weight loss or improved health, relying too heavily on these fads can be problematic. Many popular diets lack scientific support and may eliminate essential nutrients, leading to unbalanced nutrition. Nutrition experts emphasize that sustainable eating should focus on balanced meals, moderation, and individual needs rather than quick fixes. Building a healthy relationship with food is more beneficial than chasing the latest diet trend.',
      'The rise of social media and online platforms has led to widespread sharing of health information, but not all of it is accurate or safe. Misinformation about supplements, treatments, and health practices can cause confusion or even harm. It’s crucial for individuals to critically assess sources, consult healthcare professionals, and rely on evidence-based guidance when making decisions about their wellness routines.',
      'Supportive wellness-focused communities play an essential role in helping people maintain healthy lifestyles. Whether online or through local meetups, these groups offer encouragement, share tips, and provide accountability. Members can exchange experiences, celebrate successes, and find motivation during challenges, creating an environment where individuals feel empowered to achieve their health goals.',
      'Achieving long-term health requires more than temporary diets or exercise bursts. Sustainable wellness involves making gradual changes that can be maintained over time, such as improving sleep habits, managing stress, and incorporating regular physical activity. By setting realistic goals and making incremental adjustments, individuals are more likely to experience lasting benefits and enhance their overall quality of life.',
    ],
    headings: [
      'Redefining holistic health approaches',
      'Promoting mental health awareness',
      'Encouraging community fitness programs',
      'Overemphasis on trendy diets',
      'Concerns about wellness misinformation',
      'Building supportive health communities',
      'Focusing on sustainable lifestyle changes',
    ],
  },
  {
    n: 5,
    topic: 'Women mathematicians',
    paragraphs: [
      'Long before modern scientific institutions emerged, certain individuals in ancient history established the foundations of mathematics as we know it. One such pioneer was Hypatia of Alexandria, a famous philosopher and mathematician in the 4th century.',
      'The early 20th century saw remarkable advancements in computing, largely propelled by the innovative work of figures like Alan Turing. Turing’s concept of a universal machine, capable of performing any computable task, laid the foundation for modern computers.',
      'Humanity’s quest to explore the cosmos has been defined by groundbreaking milestones. From the launch of Sputnik 1 to the Apollo moon landings, each mission has broadened our understanding of space and our place in the universe.',
      'The study of geometry and motion was irrevocably altered by the works of Isaac Newton and later Albert Einstein. Newton’s laws provided the mathematical foundation for understanding motion on Earth and in space, while Einstein’s theory of general relativity revolutionized our understanding of gravity.',
      'One of the most profound ideas in modern physics is the link between symmetry and the laws of nature. Emmy Noether, a brilliant German mathematician, proved a theorem that demonstrated how physical laws are intrinsically linked to symmetrical properties.',
      'Despite advancements in science and technology, many groups remain underrepresented in STEM fields. In recent decades, educators and organizations have worked to foster more inclusive environments, offering scholarships, mentorship, and outreach programs.',
      'In many parts of the world, individuals have had to fight for the right to education, particularly in scientific disciplines. A well-known example is the story of 19th-century women who were denied entry to universities.',
    ],
    headings: [
      'Breaking New Ground in Ancient Mathematics',
      'Trailblazing Computer Science',
      'Driving Space Exploration Forward',
      'Transforming Geometry and Motion',
      'Connecting Symmetry to Physics',
      'Encouraging Diversity in STEM',
      'Breaking Through Educational Barriers',
    ],
  },
  {
    n: 6,
    topic: 'Technology advances',
    paragraphs: [
      'The way people use technology is changing quickly. Today, new devices and apps are easier to use. People can talk to machines, use hand gestures, or even use their face to control them. This helps make technology feel more natural and simple. It also improves how we use technology in our daily life and at work.',
      'Smart machines and software are now doing boring and repeated tasks in many workplaces. These tools, often powered by artificial intelligence (AI), save time and help workers focus on more important and creative jobs. As a result, companies work better and grow faster in many fields.',
      'More and more schools are using technology in their lessons. They teach students skills like computer coding, robotics, and how to use digital tools. These programs help students prepare for future jobs, and also build creativity and problem-solving skills, which are important in the digital world.',
      'Using digital devices too much can cause problems. Spending too much time in front of screens can make people feel lonely, stressed, or tired. It can also make it harder to focus or talk with others. That’s why it’s important to have a good balance between screen time and offline activities like exercise, talking with friends, or enjoying nature.',
      'Not everyone has the same access to technology. Some people don’t have fast internet or modern devices, so they miss chances to learn or find jobs. This creates unfair gaps in society. To fix this, we need good plans and community programs to give more people access to the tools they need.',
      'Technology communities are groups of people who love working with tech. They share ideas, help each other, and work together on new projects. These communities support learning and help turn smart ideas into real products or services that can help others.',
      'As technology grows, people are also thinking about the environment. Many companies are now creating eco-friendly products and using green practices to reduce harm to nature. These actions help protect the Earth and make sure that digital progress is good for our planet in the long term.',
    ],
    headings: [
      'Redefining Human-Technology Interaction',
      'Boosting Productivity Through Intelligent Automation',
      'Promoting Technology-Based Education Programs',
      'Overreliance on Digital Interfaces',
      'Concerns About Disparities in Access to Technology',
      'Building Innovative Tech Communities',
      'Focusing on Sustainable Digital Solutions',
    ],
  },
  {
    // Nguồn chưa có bài đọc -> để DRAFT
    n: 7,
    topic: 'Cultural Exchange',
    paragraphs: NO_PASSAGE,
    headings: [
      'Redefining Global Cultural Understanding',
      'Encouraging Cross-Cultural Festivals',
      'Promoting Language Exchange Programs',
      'Overemphasis on Commercial Tourism',
      'Concerns About Cultural Preservation',
      'Building Mutual Respect Among Communities',
      'Focusing on Authentic Cultural Experiences',
    ],
  },
  {
    // Nguồn chưa có bài đọc -> để DRAFT
    n: 8,
    topic: 'Urban Development',
    paragraphs: NO_PASSAGE,
    headings: [
      'Redefining Sustainable City Planning',
      'Encouraging Green Spaces in Urban Areas',
      'Supporting Affordable Housing Projects',
      'Overreliance on High-Rise Buildings',
      'Concerns About Traffic Congestion',
      'Strengthening Community Engagement',
      'Focusing on Renewable Energy Sources',
    ],
  },
  {
    // Nguồn chưa có bài đọc -> để DRAFT
    n: 9,
    topic: 'Digital innovation',
    paragraphs: NO_PASSAGE,
    headings: [
      'Redefining Leisure in the Digital Age',
      'Enhancing Connectivity with Mobile Apps',
      'Promoting Essential Digital Literacy',
      'Risks of Excessive Screen-Based Entertainment',
      'Concerns About Data Privacy',
      'Building Inclusive and Respectful Online Communities',
      'Prioritize human-friendly designs',
    ],
  },
  {
    n: 10,
    topic: 'Women mathematicians (phiên bản 2)',
    paragraphs: [
      'Achievements often go unnoticed when gender biases come into play. Many groundbreaking contributions from women in science, technology, and other fields are overshadowed by societal expectations, leading to a lack of recognition for their hard work and dedication.',
      'Recognizing the accomplishments of pioneering women is essential for breaking stereotypes and inspiring future generations. Women like Marie Curie, Ada Lovelace, and Katherine Johnson changed the world with their brilliance, yet their achievements were often marginalized due to their gender.',
      'Men are unfairly given credit for work that was often a joint effort or even led by women. History has been shaped by this bias, where the achievements of women were either ignored or misattributed, despite their immense contributions to progress.',
      'A long career is a testament to one’s exceptional abilities. Take the story of a female engineer who spent decades improving infrastructure in underdeveloped regions. Despite her groundbreaking work, she was often overlooked simply because of her gender, but her work left an indelible mark on society.',
      'Labels can change perceptions dramatically. The label of ‘genius’ or ‘pioneer’ is often reserved for men, but when a woman is labeled in the same way, it challenges stereotypes and forces society to recognize her contributions. This shift in perception is key to breaking down barriers and opening doors for others.',
      'Striving to create gender balance in the workplace and society at large has become a movement. Companies and governments are starting to realize that diverse teams lead to better solutions, yet the struggle for equal representation continues. The push for gender balance is not just about fairness but also about enhancing productivity and creativity.',
      'Uniformity can be a disadvantage in many settings. When everyone is expected to conform to the same mold, innovation and individuality suffer. The story of a diverse team at a tech startup shows how embracing different perspectives led to creative breakthroughs, proving that diversity is a powerful asset.',
    ],
    // Nguồn in lệch dòng: "Uniformity" bị đẩy lên cạnh chữ "Headings:" nhưng theo
    // "Mẹo nhớ Keyword" (Obscured -> ... -> Disadvantage) nó thuộc đoạn 7.
    headings: [
      'Achievements obscured by gender',
      'Recognizing the accomplishments of pioneering women',
      'Men are unfairly given credit',
      'A long career demonstrates exceptional ability',
      'The labels can change perceptions',
      'Striving to create gender balance',
      'Uniformity can be a disadvantage',
    ],
  },
  {
    n: 11,
    topic: 'Mountain (phiên bản 2)',
    paragraphs: [
      'In the modern consciousness, the definition of a mountain has evolved far beyond its geological description as a massive landform of rock and ice. Historically viewed as sacred barriers or purely natural entities, mountains are increasingly defined by humans as ‘vertical arenas’ for personal testing. This conceptual shift transforms the mountain from a part of the ecosystem into a commodity — a challenge to be overcome rather than a landscape to be respected.',
      'This new definition is driven by a powerful psychological reward: the unique feeling of achievement. When a climber pushes their physical limits to reach a summit, the combination of exhaustion and altitude creates a potent cocktail of adrenaline and pride. It is a singular sensation of conquering the impossible, offering a temporary escape from the mundane routines of daily life. This internal ‘high’ creates a deep-seated desire to return.',
      'However, in our hyper-connected era, internal satisfaction is rarely enough; it is the publicity of achievement that now drives the masses. The solitude of the peaks is often broken by the need to document and broadcast the success on social media. The mountain becomes a backdrop for digital validation, where the value of the climb is measured in likes and shares rather than personal growth.',
      'The obsession with public recognition inevitably establishes the wrong priority. Instead of prioritizing safety, skill acquisition, or the appreciation of nature’s subtle beauty, many climbers become fixated solely on ‘bagging the peak’. This ‘summit fever’ encourages rushing, dangerous shortcuts, and a lack of preparation. The journey itself is ignored in a frantic race to the top, reducing the majestic experience to a mere checklist item.',
      'This distorted mindset leads to a disturbing relevance — a troubling reality where our ego directly impacts the environment. As more people flock to the mountains with the wrong priorities, we witness a direct correlation between human traffic and environmental degradation. Trails are eroded, campsites are littered with non-biodegradable waste, and delicate wildlife habitats are disturbed.',
      'Facing this ecological crisis, the mountaineering community is being forced to shift its focus on sustainability. We are realizing that the mountains are finite resources that cannot withstand endless abuse. This creates a new imperative: implementing stricter limits on climber numbers, enforcing ‘leave no trace’ policies, and promoting ethical tourism. The goal is shifting from conquering the land to preserving it.',
      'Ultimately, this move toward preservation fosters a more intimate relationship with the mountain. When we stop viewing the peak as an enemy to defeat or a trophy to display, we begin to see it as a partner. This new relationship is built on humility, silence, and deep respect for the natural world. We learn to climb not just to stand on the mountain, but to be with the mountain.',
    ],
    headings: [
      'Changing the definition of mountain',
      'The unique feeling of achievement',
      'Publicity of achievement',
      'The wrong priority',
      'A disturbing relevance',
      'Focus on sustainability',
      'A more intimate relationship',
    ],
  },
];

/** UUID tiền định để chạy lại script không sinh bản ghi trùng. */
function idOf(n) {
  return 'a4000000-0000-4000-8000-' + String(n).padStart(12, '0');
}

/** Nhãn đoạn văn theo đề Aptis. */
const PARAGRAPH_LABELS = ['A', 'B', 'C', 'D', 'E', 'F', 'G'];

function buildDoc(set) {
  const id = idOf(set.n);
  const hasPassage = set.paragraphs !== null;

  if (set.headings.length !== 7) {
    throw new Error(set.n + ': phải có đúng 7 tiêu đề');
  }
  if (hasPassage && set.paragraphs.length !== 7) {
    throw new Error(set.n + ': phải có đúng 7 đoạn văn');
  }

  // Bên trái: 7 đoạn văn. Sanitizer giữ nguyên thứ tự leftItems.
  const leftItems = (hasPassage ? set.paragraphs : set.headings).map(function (text, i) {
    return {
      id: 'para' + (i + 1),
      code: 'Paragraph ' + PARAGRAPH_LABELS[i],
      content: hasPassage
        ? text
        : '[Chưa có nội dung đoạn ' + PARAGRAPH_LABELS[i] + ' — cần biên tập bổ sung]',
    };
  });

  // Bên phải: 7 tiêu đề, hiện trong dropdown.
  const rightItems = set.headings.map(function (text, i) {
    return { id: 'h' + (i + 1), code: String(i + 1), content: text };
  });

  // Đáp án: đoạn thứ N ứng với tiêu đề thứ N.
  const matches = {};
  for (var i = 1; i <= 7; i++) {
    matches['para' + i] = 'h' + i;
  }

  const item = {
    id: 'item_1',
    sequenceNo: NumberInt(1),
    prompt: {
      format: 'PLAIN_TEXT',
      value: 'Ghép mỗi đoạn văn với tiêu đề phù hợp.',
    },
    responseType: 'MATCHING',
    required: true,
    maxScore: 14,
    options: [],
    leftItems: leftItems,
    rightItems: rightItems,
    constraints: {
      // 2đ mỗi đoạn đúng, không có perfect bonus (theo part_scoring_rules Part 4)
      pointsPerCorrect: 2,
    },
    rubricCode: null,
    answerKey: {
      type: 'MATCHING',
      selectedOptionId: null,
      selectedOptionIds: [],
      matches: matches,
      orderedOptionIds: [],
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
    instructions: 'Đọc bài văn và ghép tiêu đề phù hợp với từng đoạn.',
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
      // BẬT: tiêu đề trong nguồn xếp đúng thứ tự đoạn, không trộn thì lộ đáp án.
      shuffleOptions: true,
      shuffleItems: false,
      maxAudioPlays: null,
      showAnswerAfterEachItem: false,
      allowReview: true,
    },
    scoring: {
      strategy: 'PARTIAL_MATCH',
      partialCredit: true,
      maxScore: 14,
    },
    createdAt: new Date(),
    updatedAt: new Date(),
  };
}

let ready = 0;
let draft = 0;
SETS.forEach(function (set) {
  const doc = buildDoc(set);
  target.question_set_documents.replaceOne({ _id: doc._id }, doc, { upsert: true });
  if (set.paragraphs === null) {
    draft++;
    print('upserted ' + doc.title + '  (' + set.topic + ')  [CHUA CO BAI DOC]');
  } else {
    ready++;
    print('upserted ' + doc.title + '  (' + set.topic + ')');
  }
});

print('---');
print('Đã ghi ' + (ready + draft) + ' bộ Reading Part 4 (' + ready + ' đủ nội dung, ' + draft + ' chờ bài đọc).');
print('Tổng document Part 4 = ' + target.question_set_documents.countDocuments({ partId: PART_ID }));
