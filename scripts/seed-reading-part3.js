// Seed 14 bộ Reading Part 3 (ghép nhận định với người nói) vào MongoDB.
//
// Chạy:
//   docker exec -i aptis-mongo mongosh --quiet < scripts/seed-reading-part3.js
//   docker exec -i aptis-mysql mysql -uaptis -paptis aptis < scripts/seed-reading-part3.sql
//
// Mỗi bộ: 1 item MATCHING, 7 nhận định (leftItems) ghép với 4 người (rightItems).
// 2đ/nhận định đúng + 2đ nếu đúng hết = 16đ, khớp part_scoring_rules của Part 3.
//
// shuffleOptions TẮT: nhãn A/B/C/D của rightItems phải khớp đoạn văn trong
// stimulus, trộn sẽ làm học viên đọc "Person A" mà chọn ra người khác.
// Sanitizer giữ nguyên thứ tự leftItems và chỉ trộn rightItems khi cờ này bật.

const target = db.getSiblingDB('aptis');

const PART_ID = '16000000-0000-4000-8000-000000000013'; // Reading Part 3
const TASK_TYPE = 'SPEAKER_MATCHING';

// answers: đáp án cho 7 nhận định theo đúng thứ tự statements, giá trị là người A-D.
const SETS = [
  {
    n: 1,
    topic: 'Games from childhood',
    people: {
      A: 'In the past, I really liked playing board games. Now, to limit the children from using computers, I often spend time playing with them. However, I have struggled with them because the games nowadays have more characters and rules, making us think a lot every time we play. Despite this, my children and I still like it and have a good time together.',
      B: 'When I was a child, I often played soccer with other children of the same age. We usually played in the schoolyard and sometimes in the open spaces of the neighborhood. We divided into small teams and chased the ball until we were all tired.',
      C: "When I was a child, I didn't like going out to play, so I chose reading books as a form of entertainment. The stories described in the pages of books helped me discover my own world. Later, when I grew up, I started liking modern games with eye-catching interfaces, which help me relax and increase my creativity.",
      D: 'When I was a child, I really liked outdoor activities. I remember that on bad weather days, I was always by the window, glued to it, looking outside and praying for the rain to stop. At those times, my mother often gave me paper and a box of crayons. I really enjoyed that drawing activity and often drew at home when the weather was bad.',
    },
    statements: [
      "Who finds today's games harder than before?",
      'Who enjoyed playing with friends in childhood?',
      'Who enjoys playing with their children?',
      'Who waited and hoped to go outside?',
      'Who prefers modern games?',
      'Who enjoyed arts as a child?',
      'Who enjoyed reading books as a child?',
    ],
    answers: ['A', 'B', 'A', 'D', 'C', 'D', 'C'],
  },
  {
    n: 2,
    topic: 'Extreme sports',
    people: {
      A: "Before diving into any extreme sport, I truly believe it's crucial to undergo proper training. While these activities can be thrilling, they also carry risks if you're not well-prepared. I've witnessed people injuring themselves simply because they didn't take the necessary precautions. That's why I always make sure to complete a training program and familiarize myself with the safety guidelines before trying something new. With the right preparation, extreme sports can be an amazing experience.",
      B: "I've always had a fondness for more traditional sports such as swimming, running, and tennis. They're enjoyable and easy to incorporate into a routine. However, a few months ago, I had the chance to go bungee jumping during a vacation, and it turned out to be an unforgettable experience. I didn't anticipate having so much fun! While I still prefer regular sports for daily exercise, I now feel much more open to trying extreme sports occasionally for the thrill.",
      C: "What I appreciate most about extreme sports is the unique way they allow me to connect with nature. Activities like rock climbing and mountain biking enable me to explore stunning landscapes while also pushing my physical and mental limits. It's an escape from the everyday routine, and it makes me feel truly alive. If I had more time and resources, I would love to engage in these sports more frequently, particularly in wild, remote locations.",
      D: "I understand that some people find extreme sports exhilarating, but they've never been significant to me. In fact, I try to avoid them whenever I can. I'm not fond of the idea of placing myself in risky situations just for the sake of excitement. There are many safer alternatives to staying active and enjoying life. I'd much rather take a peaceful walk or do some yoga than jump out of an airplane or scale a mountain. It's simply not my cup of tea.",
    },
    statements: [
      'Who finds extreme sport unimportant?',
      'Who finds training before participating is important?',
      'Who still likes extreme sports after playing once?',
      'Who wants to play more extreme sport?',
      'Who likes traditional sports like swimming?',
      'Who enjoys nature?',
      'Who always avoids playing extreme sport?',
    ],
    answers: ['D', 'A', 'B', 'C', 'B', 'C', 'D'],
  },
  {
    n: 3,
    topic: 'Music festival',
    people: {
      A: 'I stayed until the very last moment of the festival and absolutely loved the grand finale. The stage lit up with dazzling lights and fireworks, creating an unforgettable atmosphere. Although getting there was a hassle due to heavy traffic and packed buses, once I arrived, all those inconveniences faded away. In the end, the final performance made every bit of the struggle worthwhile.',
      B: "Normally, I steer clear of festivals, but I decided to give this one a try. Unfortunately, I didn't have a great time. The sound quality was poor, the event schedule seemed chaotic, and to top it off, it started raining heavily. The muddy ground made things even worse, and I spent most of the day feeling uncomfortable. Honestly, I didn't think it was worth the trouble. The only highlight for me was the beautiful park where the festival took place.",
      C: "I really enjoyed the lively atmosphere created by the music. One of the bands on the opening night was so amazing that I couldn't help but sing along. However, everything was quite expensive. The tickets were pricey, and the food and drinks were ridiculously overcharged. I ended up spending more than I had planned. Even though the performances were great, I do hope the organizers will bring the prices down next year.",
      D: "For me, the most memorable part of the festival was its location. The park by the river was vast and picturesque, with plenty of spots to sit and unwind between performances. I enjoyed a nice lunch there, though it was a bit pricey. Some of the shows were enjoyable, but I didn't stay for the entire event. Overall, it was the venue that left the biggest impression on me.",
    },
    statements: [
      'Who experienced bad weather?',
      'Who loved one of the performances?',
      'Who thought it was too expensive?',
      'Who found the traffic difficult?',
      'Who liked the final performance of the show?',
      "Who didn't like the festival overall?",
      'Who liked the location?',
    ],
    answers: ['B', 'C', 'C', 'A', 'A', 'B', 'D'],
  },
  {
    n: 4,
    topic: 'Technology in childhood',
    people: {
      A: 'When I was young, I enjoyed playing simple computer games that my dad had programmed for me. Today, I teach my children to code using easy-to-use platforms like Scratch. These tools make learning programming enjoyable, though I spend time helping them grasp the logic behind it. Working together on coding fosters both creativity and teamwork.',
      B: "As a child, I loved spending time with my friends, building and controlling toy robots. I'll never forget the thrill of making them move. Those experiences sparked my passion for technology, and I still look back fondly on those moments of discovery.",
      C: 'When I was younger, I was fascinated by science magazines about robots and computers. The articles fueled my curiosity. Now, I develop mobile apps, creating tools for daily life. Thanks to modern software, the development process has become faster, but the excitement of innovation remains the same.',
      D: 'As a kid, I spent rainy days with my siblings watching TV shows about gadgets and inventions. We eagerly awaited each new episode. Today, I prefer taking online courses to stay up-to-date with AI and blockchain. They offer flexibility and are a great way to keep pace with the rapidly changing tech world.',
    },
    statements: [
      'Who finds modern tools more accessible?',
      'Who now enjoys app development?',
      'Who loved playing with toy robots as a child?',
      'Who loved watching tech shows as a child?',
      'Who now prefers online learning?',
      'Who enjoys coding with family?',
      'Who loved science magazines as a child?',
    ],
    answers: ['A', 'C', 'B', 'D', 'D', 'A', 'C'],
  },
  {
    n: 5,
    topic: 'Technology in childhood (phiên bản 2)',
    people: {
      A: "When I was a child, I enjoyed building simple circuits with my parents using basic kits. Today, I collaborate on tech projects with my cousins using drag-and-drop coding platforms. These tools make the development process easier, but I always take the time to thoroughly test our creations. It's a wonderful way to foster creativity and work together.",
      B: 'As a kid, I played with programmable toys like robotic pets alongside my friends. I can still recall the excitement of programming their movements. Those toys sparked my interest in logic and curiosity, and I continue to cherish those early experiences with technology.',
      C: 'Growing up, I was fascinated by books about inventors and their innovative creations. Those stories inspired my imagination. Today, I design prototypes using 3D modeling software. The tools are much more precise now, but the joy of creating something new still feels just like the excitement of those childhood books.',
      D: "I spent many hours as a child exploring my family's old computer, learning basic commands. Rainy days often meant staying indoors and experimenting with different software. Today, I keep up with the latest innovations by listening to tech podcasts. They're not only entertaining but also help me stay connected to the ever-evolving tech world.",
    },
    statements: [
      'Who now enjoys 3D modeling?',
      'Who finds modern platforms user-friendly?',
      'Who loved playing with programmable toys as a child?',
      'Who loved exploring early computers as a child?',
      'Who enjoys creating tech projects with family?',
      'Who loved reading about inventions as a child?',
      'Who now prefers tech podcasts?',
    ],
    answers: ['C', 'A', 'B', 'D', 'A', 'C', 'D'],
  },
  {
    n: 6,
    topic: 'Work and life balance',
    people: {
      A: 'When I was a child, I enjoyed playing board games with my parents after their busy workdays. Now, I get to share that experience with my own kids, and having a four-day workweek gives us more time together. Flexible schedules are a big help, but I always make sure to plan ahead so I can balance both work and family life. These are the moments that create lasting memories.',
      B: "As a kid, I would set up pretend offices with my friends, using toy phones and notebooks. I loved taking on the role of 'boss' and organizing our tasks. Those imaginative games taught me valuable lessons in organization and leadership, and I still laugh thinking about the 'serious' meetings we held.",
      C: 'When I was younger, I devoured books about different professions, dreaming about what my future career might be. Those books inspired my ambition. Today, I rely on productivity apps to keep track of my tasks in my four-day workweek. While the apps make my work more efficient, the excitement of organizing and planning is still the same.',
      D: "As a child, I spent countless evenings playing tag with my friends in the neighborhood. On rainy days, though, I often found myself feeling bored indoors. Now, after work, I practice mindfulness to help me relax and recharge. It's especially helpful with a shorter workweek, as it keeps me focused and refreshed.",
    },
    statements: [
      'Who now enjoys productivity apps?',
      'Who loved outdoor play as a child?',
      'Who enjoys family time with board games?',
      'Who loved organizing pretend offices as a child?',
      'Who finds modern schedules more flexible?',
      'Who loved reading about careers as a child?',
      'Who now prefers mindfulness practices?',
    ],
    answers: ['C', 'D', 'A', 'B', 'A', 'C', 'D'],
  },
  {
    n: 7,
    topic: 'Childhood memories',
    people: {
      A: "When I was a child, I loved sitting by the fireplace listening to my grandfather's folktales. His voice brought every character to life, and those evenings always felt magical — they taught me the power of imagination. Nowadays, I share that same joy with my nieces by reading interactive storybooks on tablets. The animations and sounds make the stories more vivid and exciting for them. Still, I always take care to choose content that's suitable for their age. To me, blending old traditions with modern technology is a beautiful way to keep storytelling alive across generations.",
      B: "When I was young, I used to ride my bike around the village with my friends almost every afternoon. I can still recall the feeling of the wind brushing against my face, the excitement of racing each other, and the pure sense of freedom it brought. Those simple rides weren't just fun — they taught me what independence and adventure felt like, lessons that stayed with me as I grew up. Nowadays, it's a bit sad to see that many children spend more time indoors, glued to screens instead of exploring outside. Sometimes I find myself missing those carefree afternoons when happiness was as simple as pedaling down a dusty road.",
      C: "As a kid, I could spend hours drawing animals, trees, and landscapes with my box of crayons and pencils. I loved playing with bright colors and shapes, and I always felt proud showing my drawings to my family. What started as a simple childhood hobby slowly turned into a lifelong passion. Now, I'm a graphic designer, creating digital art for various clients. Modern design tools help me bring my ideas to life with more precision, yet the creative joy I feel is just like it was back then.",
      D: 'When I was growing up, I loved going on camping trips with my family in the countryside. We pitched our tents, cooked simple meals over a fire, and spent long nights gazing at the stars. Those moments made me feel deeply connected to nature and left me with unforgettable memories. Sometimes, though, rainy weather would ruin our plans, and I always felt a bit sad when we had to stay indoors. These days, my adventures have taken a different form — I enjoy visiting museums and exhibitions instead. Exploring history through artifacts and stories gives me a similar sense of curiosity and wonder.',
    },
    statements: [
      'Who now enjoys graphic design?',
      'Who loved camping as a child?',
      'Who finds modern books more engaging?',
      'Who loved drawing as a child?',
      'Who now prefers museum visits?',
      'Who enjoys storytelling with family?',
      'Who loved bike riding as a child?',
    ],
    answers: ['C', 'D', 'A', 'C', 'D', 'A', 'B'],
  },
  {
    n: 8,
    topic: 'Music festival (phiên bản 2)',
    people: {
      A: "I went to the festival, but on the first day, I didn't enjoy it much. It felt a bit dull and not very exciting. Still, the stage was bright with lights and fireworks, and the overall atmosphere was unforgettable. The music lifted my mood and made me feel truly happy. Interestingly, by the final day, everything seemed different — I began to enjoy it a lot more. In the end, I was really glad I decided to go.",
      B: "I've been to this festival every year, and of course, I joined again this time. But honestly, I didn't enjoy the music, and the weather made things worse. It kept raining, turning the ground muddy and uncomfortable for everyone. After this experience, I think I won't go again next year.",
      C: "I absolutely loved the energy of the music and enjoyed every part of the program from start to finish. Although it rained a little, it didn't bother me at all. The only thing I didn't like was the expensive ticket — I spent more than I had planned. Despite that, I still had a great time and hope the organizers consider lowering the price in the future.",
      D: "I was one of the musicians performing on the first day of the festival, and I also met several familiar bands there. Even though I only played a few songs, I stayed until the event ended. The pay wasn't great, but I really enjoyed myself because I got to reconnect with friends. However, I'm still thinking about the long travel distance since the venue was quite far from the city center.",
    },
    statements: [
      'Who enjoyed the music throughout all the festival?',
      'Who only liked the last day?',
      'Who was disappointed with the weather?',
      'Who met old friends again?',
      'Who thought the location was not good?',
      "Who didn't like the festival overall?",
      'Who thought it was expensive?',
    ],
    answers: ['C', 'A', 'B', 'D', 'D', 'B', 'C'],
  },
  {
    n: 9,
    topic: 'Extreme sports (phiên bản 2)',
    people: {
      A: "For me, the most important thing about extreme sports is being well-prepared. Many people think it's all about excitement and courage, but I don't see it that way. Without proper training, it's easy to get hurt or even put others at risk. I once took a rock-climbing course and spent weeks learning how to use the equipment correctly. After that, the actual climb was much more enjoyable because I felt confident. I believe training not only keeps you safe but also makes the experience more relaxed and rewarding.",
      B: "I've always preferred traditional sports like swimming and running because they help me stay healthy without being too risky. Still, I was curious about how extreme sports might feel, so I tried bungee jumping during a holiday last year. At first, I was really nervous, but once I jumped, the feeling was incredible. It was a kind of thrill I had never felt before. Even so, I still swim every week because it's safer and more practical, though I admit extreme sports can be exciting to try at least once.",
      C: "Honestly, I don't really understand why people enjoy extreme sports. They seem dangerous and unnecessary to me. I've never tried one, and I don't intend to. Some friends have invited me to go snowboarding or paragliding, but I always refuse. It's not that I dislike sports — I actually enjoy cycling and tennis — but I just don't see any reason to risk my health for a few seconds of excitement. In my opinion, extreme sports aren't essential for happiness, so I stay away from them whenever I can.",
      D: "What I love most about extreme sports is that they often take place in beautiful natural settings. Last summer, I went kayaking on a wild river, and the scenery was breathtaking. I also tried mountain biking through the forest and loved the feeling of fresh air and freedom. For me, it's not just about the sport itself but also about being surrounded by mountains, trees, and rivers. I sometimes wish I had more time and money to do these activities more often. Extreme sports give me energy and make me feel close to nature.",
    },
    statements: [
      'Who enjoys being outdoors when doing extreme sports?',
      'Who believes extreme sports are not important?',
      'Who once tried an extreme sport and enjoyed it?',
      'Who wishes to do more extreme sports in the future?',
      'Who thinks preparation is necessary before doing extreme sports?',
      'Who always avoids extreme sports?',
      'Who usually does ordinary sports?',
    ],
    answers: ['D', 'C', 'B', 'D', 'A', 'C', 'B'],
  },
  {
    n: 10,
    topic: 'Free time activity',
    people: {
      A: 'When I was a teenager, I loved recording short stories on an old tape recorder with my cousins. We spent hours coming up with ideas and acting them out just for fun. These days, we make podcasts using modern apps that make editing and publishing much easier and more enjoyable. Even though technology has simplified the process, we still spend a lot of time planning each episode carefully. For me, podcasting is a creative way to express ideas and connect with people on a deeper level.',
      B: 'As a child, I spent many sunny afternoons flying kites in the park with my brothers and sisters. Watching my kite rise high into the sky always filled me with happiness and excitement. Those simple yet meaningful moments taught me patience and coordination. Even now, whenever I see children flying kites, I feel warm memories returning. Those carefree days will always be some of my favorite childhood moments.',
      C: "When I was little, I was fascinated by doing jigsaw puzzles with my family. Carefully fitting each piece into place was both fun and satisfying. Now that I'm older, I often play strategy-based video games, which feel like a modern version of puzzles. They're not only entertaining but also help me stay focused and think critically. For me, these games bring the same sense of challenge and accomplishment that puzzles once did.",
      D: 'I grew up near a beautiful lake, and swimming there with my friends was one of my favorite things to do. It was such a great way to spend time outdoors, though rainy days sometimes left me feeling bored at home. Nowadays, I practice yoga to relax and recharge after long working hours. It has helped me stay calm, balanced, and focused. Yoga has become an important part of my routine and a great way to take care of both my body and mind.',
    },
    statements: [
      'Who now enjoys video games?',
      'Who enjoys podcasting with friends?',
      'Who loved swimming as a child?',
      'Who loved puzzles as a child?',
      'Who now prefers yoga?',
      'Who loved kite flying as a child?',
      'Who finds modern apps easier to use?',
    ],
    answers: ['C', 'A', 'D', 'C', 'D', 'B', 'A'],
  },
  {
    n: 11,
    topic: 'Job and training',
    people: {
      A: "When I first graduated from school, I wasn't sure what to do, so I joined several volunteer programs with different companies and organizations to gain experience. I really enjoyed volunteering because it helped me decide on a career path and gave me many valuable lessons. I also believe I was able to make a difference through my work.",
      B: "Back in school, I already knew I wanted to become a teacher, so I didn't need to try other jobs. I decided to study education at university, which is free in my country. Last summer, I did some practical training in local schools, and it was extremely helpful for my future career.",
      C: "When I was young, I used to help my neighbor, a plumber, with simple jobs like measuring pipes, loosening screws, and handling tools. It felt very natural for me to learn that kind of work, so later I studied for two years at university to become an electrician. Now, I've learned that there are shorter courses available in this field, and I regret not choosing that option instead.",
      D: "After graduating, I found it really difficult to get a job. I applied to many companies, but none accepted me because I lacked experience. Eventually, I found work at a gaming company that allowed me to work from home. It didn't affect my daily schedule — I worked at night while my colleagues worked during the day — and that arrangement suited me perfectly.",
    },
    statements: [
      'Who likes working with their hands?',
      'Who enjoys working during their training?',
      'Who thinks it is very hard to get your first job?',
      'Who thinks their training was too long?',
      'Who did not want to choose another job?',
      'Who enjoys working in a flexible working environment?',
      'Who thinks they benefited from working for free?',
    ],
    answers: ['C', 'B', 'D', 'C', 'B', 'D', 'A'],
  },
  {
    n: 12,
    topic: 'Music festival (phiên bản 3)',
    people: {
      A: "This was my first time attending the Music Festival, and to be honest, the weather really didn't cooperate. It rained heavily on the first two days, which made it difficult to enjoy the outdoor activities. I still got wet in the tent. But I didn't let that ruin the experience. On the final day, the skies cleared up and the performances were truly amazing — especially the final act in the evening. That last day made it all worthwhile, and I left with some great memories despite the poor weather.",
      B: "I've been to this festival a couple of times in the past, the quality was good the last times I came, but this time is completely different. The sound quality wasn't great, and the whole event just felt disorganised. There weren't enough facilities, and the staff didn't seem prepared to handle the crowd. I couldn't even interact with the band. I don't think I'll be coming back next year. It's simply not worth the money or the time anymore.",
      C: "The festival this year had one of the best line-ups I've seen so far. I absolutely loved the energy of the performances, and the music was spot on throughout the weekend. However, I have to say the ticket prices were far too high, especially for students. I paid almost double what I did two years ago, and although I enjoyed the music, I'm not sure it offered good value for money. If they don't lower the prices next year, a lot of people might skip it.",
      D: "We were playing in a band and we finished our performance in the morning. However, I stayed at the festival to meet up with some old band mates. We talked a lot. However, I didn't like the venue. It was too crowded and not well organised. The road to the tent village was also congested. I think they should choose a better location next year.",
    },
    statements: [
      'Who liked the last performance of the show?',
      'Who was disappointed with the festival?',
      'Who thought it was too expensive?',
      'Who experienced bad weather?',
      'Who liked to meet old friends?',
      'Who enjoyed the music at the event?',
      "Who didn't like the venue?",
    ],
    answers: ['A', 'B', 'C', 'A', 'D', 'C', 'D'],
  },
  {
    n: 13,
    topic: 'Volunteering',
    people: {
      A: "I'm very busy and rarely have any free time to do anything, so even spending a few hours volunteering is quite difficult. I would have to take half a day off work. I see many people in need, and they genuinely require additional financial support. That's something I can help with because I earn a good salary. Making monthly donations is not a problem for me — it's how I show my support and contribution.",
      B: 'Some people enjoy volunteering abroad, but honestly, I feel that most people are more interested in traveling. I believe we should use our time more meaningfully. Every town has many people in need. Their circumstances are difficult, and they lack the means to improve their quality of life. They are individuals who have contributed a great deal to the country. Sharing stories with them helps us understand the differences between generations. We can also broaden our knowledge of local history, traditions, and culture through their experiences.',
      C: "I believe there are many ways for us to show kindness through volunteering. I am currently retired and helping to build houses for people in need. I work with a volunteer organization that has well-prepared and clear plans. Through this work, I have had the opportunity to experience different foreign cultures. We are often sent to various countries to carry out projects, so it's also a great way to travel while still doing something meaningful. This work involves physical labor, which helps improve our physical health — something some people only begin to realize after some time.",
      D: "My mother told me to do local volunteering because she is a member of that organization, but I'm not very interested. I prefer volunteering abroad because I can develop soft skills — something that will benefit my future career. In addition, meeting new people helps me expand my network and build valuable connections that I can use later in my professional life.",
    },
    statements: [
      'Who wants to enhance their future career?',
      'Who helps support charity work with money?',
      'Who thinks it should help the local community?',
      'Who thinks volunteering helps improve physical health?',
      'Who thinks it can improve knowledge about culture?',
      'Who thinks it is a way to travel?',
      'Who wants to make new friends?',
    ],
    answers: ['D', 'A', 'B', 'C', 'B', 'C', 'D'],
  },
  {
    n: 14,
    topic: 'Career',
    people: {
      A: "After graduating, I wanted to take some time to figure out what I truly wanted. I started looking for temporary jobs, but it was quite difficult because most companies don't hire people without experience. Eventually, a game company contacted me, and I agreed to work for them. The job is hybrid, so sometimes I work in the evenings, but I'm fine with that.",
      B: "I went to university right after finishing high school. I had always wanted to become a teacher, so I didn't need to explore other career options. Three months ago, I did an internship at a local school. It was an eye-opening experience, even though the workload was heavier than I expected. However, I believe it was very worthwhile.",
      C: "When I graduated, I didn't really know what I wanted to do. Some people advised me to start working right away, but I wanted to gain some practical experience first. That's why I applied for various volunteer positions. Although I didn't earn any money, I had the chance to try out different types of work. Looking back, I feel happy with my decision because of the valuable knowledge I gained.",
      D: 'When I was younger, I lived near a plumber and sometimes worked with her. She gave me simple tasks like checking for pipe leaks or tightening screws. So later on, it felt natural for me to go to university to become an electrician. Now, when I see short online electrical courses, I wish I had chosen them instead of going to university.',
    },
    statements: [
      'Who did not want to change to other careers?',
      'Who thinks it was hard to get the first job?',
      'Who enjoys working in a flexible work environment?',
      'Who enjoyed doing things with their hands?',
      'Who thinks their training was too long?',
      'Who enjoyed working when training?',
      'Who thinks they benefited from working for free?',
    ],
    answers: ['B', 'A', 'A', 'D', 'D', 'B', 'C'],
  },
];

/** UUID tiền định để chạy lại script không sinh bản ghi trùng. */
function idOf(n) {
  return 'a3000000-0000-4000-8000-' + String(n).padStart(12, '0');
}

/** Nhãn nhận định theo đề Aptis: G, H, I, J, K, L, M. */
const STATEMENT_LABELS = ['G', 'H', 'I', 'J', 'K', 'L', 'M'];
const PERSON_CODES = ['A', 'B', 'C', 'D'];

function buildDoc(set) {
  const id = idOf(set.n);

  if (set.statements.length !== 7 || set.answers.length !== 7) {
    throw new Error(set.n + ': phải có đúng 7 nhận định và 7 đáp án');
  }

  // Bên trái: 7 nhận định, giữ nguyên thứ tự (sanitizer không trộn leftItems)
  const leftItems = set.statements.map(function (text, i) {
    return { id: 'st' + (i + 1), code: STATEMENT_LABELS[i], content: text };
  });

  // Bên phải: 4 người. Nhãn phải khớp "Person A/B/C/D" trong stimulus.
  const rightItems = PERSON_CODES.map(function (code) {
    return { id: 'p' + code, code: code, content: 'Person ' + code };
  });

  // matches: nhận định -> người
  const matches = {};
  set.answers.forEach(function (personCode, i) {
    if (PERSON_CODES.indexOf(personCode) < 0) {
      throw new Error(set.n + ': đáp án không hợp lệ ' + personCode);
    }
    matches['st' + (i + 1)] = 'p' + personCode;
  });

  // Bài đọc chung: 4 đoạn ý kiến, đánh dấu rõ từng người
  const passage = PERSON_CODES.map(function (code) {
    return 'Person ' + code + ':\n' + set.people[code];
  }).join('\n\n');

  const item = {
    id: 'item_1',
    sequenceNo: NumberInt(1),
    prompt: {
      format: 'PLAIN_TEXT',
      value: 'Ghép mỗi nhận định với người phù hợp.',
    },
    responseType: 'MATCHING',
    required: true,
    maxScore: 16,
    options: [],
    leftItems: leftItems,
    rightItems: rightItems,
    constraints: {
      // 2đ mỗi nhận định đúng; đúng cả 7 thì validator trả full 16đ
      // (7 x 2 = 14, cộng 2đ perfect bonus theo part_scoring_rules)
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
    instructions: 'Đọc ý kiến của bốn người và ghép mỗi nhận định với người phù hợp.',
    accessLevel: 'FREE',
    stimulus: {
      type: 'TEXT',
      format: 'PLAIN_TEXT',
      value: 'Topic: ' + set.topic + '\n\n' + passage,
    },
    sections: [],
    items: [item],
    assets: [],
    settings: {
      // TẮT: nhãn A/B/C/D của rightItems phải khớp đoạn văn trong stimulus.
      shuffleOptions: false,
      shuffleItems: false,
      maxAudioPlays: null,
      showAnswerAfterEachItem: false,
      allowReview: true,
    },
    scoring: {
      strategy: 'PARTIAL_MATCH',
      partialCredit: true,
      maxScore: 16,
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
print('Đã ghi ' + count + ' bộ Reading Part 3.');
print('Tổng document Part 3 = ' + target.question_set_documents.countDocuments({ partId: PART_ID }));
