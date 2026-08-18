// Kéo dài các bài nói mẫu Speaking Part 4 chưa đạt 180 từ.
//
// Đề Part 4 yêu cầu nói 180–240 từ, nên bài mẫu ngắn hơn thì không còn là mẫu
// tốt: học viên đọc theo sẽ thiếu thời lượng. Script này nối thêm 2–3 câu vào
// cuối những bài mẫu ngắn, khớp theo một đoạn chữ duy nhất trong câu hỏi.
//
// Chạy lại được nhiều lần: bài nào đã đủ 180 từ thì bỏ qua.
//
//   node scripts/extend-part4-samples.js
//   docker exec -i aptis-mongo mongosh --quiet < scripts/seed-speaking-part4.js

const fs = require('fs');
const path = require('path');

const file = path.join(__dirname, 'seed-speaking-part4.js');
let src = fs.readFileSync(file, 'utf8');

/** khoá = đoạn chữ nhận dạng câu hỏi (chữ thường); giá trị = phần nối thêm. */
const EXTRA = {
  'received a difficult question':
    ' I also noticed afterwards that the interviewer seemed more interested in how I reasoned than in the mistake itself. That changed how I prepare for interviews now: instead of memorising perfect answers, I think about what each experience actually taught me.',
  'visited a friend':
    ' Since that visit we have made it a habit to alternate: one year she comes to my city, the next year I go to hers. Having something planned in the calendar makes it far more likely to actually happen, which is a lesson I have applied to other friendships too.',
  'achieved something':
    ' I keep the certificate in my desk drawer rather than on the wall, but I look at it occasionally when I feel stuck on something difficult. It is a useful reminder that progress which feels invisible day to day can still add up to something significant over months.',
  'had a long trip':
    ' On the way home I slept for most of the journey, completely exhausted but satisfied. What surprised me afterwards was how clearly I remembered small details of that trip compared with holidays where I had simply flown somewhere and stayed in a resort.',
  'you helped someone':
    ' What I did not expect was how much I gained from it as well. Living in a city, it is easy to know nobody in your own building. Through those short conversations I ended up feeling much more connected to the place where I live.',
  'busy time':
    ' I also learned to say no more often. During that period I had agreed to several small commitments that were not important, and dropping them would have made everything easier. Now I check my calendar before agreeing to anything new.',
  'learned a new skill':
    ' These days I cook for my family at weekends, and my mother has even asked me for one of my recipes, which felt like a genuine achievement. It also saves me a considerable amount of money compared with two years ago.',
  'had many choices':
    ' Looking back, I am glad I did not rush the decision, but I also wish I had asked fewer people for advice. Beyond a certain point, more opinions simply made the choice harder rather than clearer.',
  'planning something':
    ' The album of old photographs turned out to be the part she liked most, even though it cost almost nothing. That taught me that thoughtfulness matters far more than money when you are preparing something for someone you love.',
  'wanted something but':
    ' I applied for a different programme the following year with much stronger experience, and although I am still waiting for the result, the application itself was far better. Failing the first time is what made the second attempt possible.',
  'hurried to do something':
    ' On the flight I also realised how much unnecessary stress I had created for myself over something entirely preventable. Now I treat preparation the night before as part of the journey rather than an optional extra.',
  'when you helped someone':
    ' We stayed in touch after graduation and he sometimes reminds me about those study sessions. It is a small thing, but knowing that a few hours of my time made a real difference to someone else is genuinely satisfying.',
  'explored a forest':
    ' I bought a proper pair of walking shoes shortly afterwards, because my ordinary trainers were completely unsuitable on the wet ground. Since then I have joined two similar walks, and I now understand why people describe hiking as a form of rest rather than exercise.',
  'activity for children':
    ' At the end of the afternoon one boy gave me his drawing to keep, which I still have somewhere. Small moments like that explain why volunteers keep returning even though the work is tiring and completely unpaid.',
  'saved money':
    ' I still have that laptop and it works perfectly well, partly because I look after it carefully. I suspect I would have been far less careful with something that had simply been given to me.',
  'visited a tall building':
    ' Afterwards we walked back through the streets we had just been looking down on, which felt strange. Seeing a familiar place from an unfamiliar angle makes you notice things you have walked past hundreds of times without registering.',
  'faced a difficult question':
    ' I have thought several times since about how children ask the questions adults have quietly agreed to stop asking. It is uncomfortable, but I think being asked something so simple occasionally is genuinely useful.',
  'holiday or vacation':
    ' We are already discussing where to go next year, although finding a week when everyone is free will be the hard part. That is exactly why I value the trips we do manage to arrange.',
  'worked in a team':
    ' Two of the group are still close friends of mine, which I did not expect from a project that started so badly. Working through a difficult situation with people tends to create a stronger bond than simply getting along easily.',
  'encountered bad weather':
    ' I also stayed in touch with that shop owner and stop by occasionally when I pass through the area. A small kindness during an inconvenient hour is the part of that day I actually remember.',
  'did an extreme sport':
    ' Since that day I have returned to the climbing centre several times, and I have also tried a short outdoor route with a guide. I still would not describe myself as an adventurous person, but I have learned that the fear before starting is usually much larger than the actual difficulty.',
  'met a new friend':
    ' We now meet almost every week, sometimes to practise English and sometimes simply to have coffee and talk about work. She has also introduced me to several other people in the club, so my circle of friends has grown considerably. I am genuinely grateful that I decided to stay that evening.',
  'received good news':
    ' I also learned something practical from that month of waiting. Constantly checking for results did not make them arrive faster; it only made me anxious. Now, when I am waiting for something important, I try to keep myself busy with other work instead of refreshing my email every hour.',
  'made a great effort':
    ' What also helped was telling a few friends about my goal, because it made it harder to quietly give up. On the days I wanted to stop, I reminded myself that I only needed to finish that single day, not the whole six months. That way of thinking is probably the most useful thing I gained.',
  'asked a good question':
    ' Since then I have made it a habit to ask at least one question in every meeting or training session I attend. Sometimes the answer is obvious and I feel slightly foolish, but far more often other people are grateful because they had the same doubt and did not want to speak first.',
  "didn't want to do":
    ' Since then I have tried to notice the difference between genuinely needing rest and simply feeling lazy. When someone asks me to join something and my only reason for refusing is tiredness, I usually go anyway. More often than not, I come home in a better mood than when I left.',
  'elderly people and children':
    ' I joined the same activity twice more after that. Each time I noticed that the elderly participants prepared something to show the children, and the children clearly looked forward to it. It made me think that these two groups are often kept apart unnecessarily, when both of them benefit from spending time together.',
  'watched a sports match':
    ' Since that night I have watched several matches with the same group of friends. I still do not follow the league closely and I cannot name most of the players, but I now understand that for many people football is less about the sport and more about belonging to something bigger than themselves.',
  'attended a music festival':
    ' Looking back, what I remember most clearly is not any particular song but the atmosphere: thousands of people singing the same words at the same time under an open sky. It is the kind of experience that makes an ordinary summer weekend feel genuinely memorable, which is why I would go again.',
  'visited a new city':
    ' We stayed only three days, which was not enough, and I already have a list of places I want to see next time. The trip also changed how I think about my own city. When I came home, I deliberately spent a weekend walking around neighbourhoods I had never explored, and found several places I liked.',
  'when you wanted to buy something':
    ' What I took from that experience is that waiting is not the same as giving up. If I still want something after a few months, it is probably a genuine need rather than an impulse, and by then I can usually afford it without sacrificing anything important.',
  'time you wanted to buy something':
    ' I have also become more relaxed about sales since then. Discounts create a feeling of urgency that makes you decide badly, and the thing you buy in a rush is often not the thing you actually needed in the first place.',
  'your sleeping habits':
    ' The clearest benefit is at work. When I sleep properly I make far fewer careless mistakes and I need much less coffee to concentrate in the afternoon. I would tell anyone struggling with sleep to start with a fixed wake-up time rather than a fixed bedtime, because that is what actually reset my rhythm.',
  "visited an old building":
    " It is strange how we travel far to see old buildings while ignoring the ones on our doorstep. Since that visit I have also started reading a little about the history of my own district, which I had never bothered to do before.",
  "received a gift":
    " Looking back, that watch also changed how I choose presents for other people. I now spend far less money than I used to, but far more time thinking about what the person actually likes.",
  "attended an English course":
    " I would recommend a small class over an app for exactly that reason. An application can correct your grammar, but it cannot put you in a room where you have to keep talking even when you are unsure.",
  "a challenge you have faced":
    " I now understand that being uncomfortable for a while is often the price of growing. Whenever something feels intimidating now, I remind myself how quickly that first difficult month became normal.",
  "read a good book":
    " It reminded me that reading is not only a private activity, and I have kept the habit since then. I now finish roughly one novel a month, and I always try to talk to somebody about it afterwards.",
  "place you have traveled to":
    " Hoi An rewards walking slowly rather than sightseeing quickly, and that is the main thing I took away from the trip. I have applied the same approach to every holiday since, choosing fewer places and staying longer in each one.",
  "broke a rule":
    " I have been reasonably careful about rules since then, although I do still question the ones that seem pointless. The difference now is that I ask first instead of simply ignoring them and hoping nobody notices.",
  "asked you to stop doing something":
    " Two weeks of silent irritation is far worse than one slightly awkward conversation, and I have repeated that to myself many times since. We shared that apartment for another year without a single serious argument.",
  "you got lost":
    " Getting lost taught me more about preparation than any advice I had read beforehand. I have also learned that turning back early, while it feels like failure, is usually the sensible decision rather than a weak one.",
  "put in a lot of effort":
    " Repeating what I was already good at had felt productive, but it was the uncomfortable practice that actually changed the result. I now apply the same idea to my English, spending most of my time on the skills I am worst at.",
  "favorite outfit":
    " The only thing I am careful about is fit, because even inexpensive clothes look reasonable if they fit properly. A tailor near my house charges very little to adjust sleeves, and it makes a surprising difference.",
  "a work of art":
    " Looking at a painting properly takes time, and rushing through a gallery is the same as not going. I have visited two more exhibitions since, and each time I deliberately choose a few works rather than trying to see everything.",
  "someone was rude to you":
    " What I took from it is that staying calm was more effective than matching her tone. I also try to remember that when I am tired and short with somebody, they have no idea what my day has been like either.",
  "you were in a hurry":
    " Since then I try to leave earlier for anything important, but I also try to remind myself that being slightly late is rarely the catastrophe it feels like in the moment. I have also had my motorbike serviced regularly, which was the actual lesson.",
  "amusement park":
    " I would go again, but I would arrive much earlier in the morning and bring sun cream. Looking back, the day is also a reminder that the best trips are usually the ones where nothing goes exactly to plan.",
  "you were helped":
    " Being helped by a stranger changes how willing you are to help other people. I also learned a little about basic maintenance that morning, and I now check the spark plug myself every few months instead of waiting for a breakdown.",
  "met a foreigner":
    " That conversation did more for my confidence than several weeks of grammar study. Since then I have deliberately spoken to tourists when they look lost, partly to help them and partly because it is free speaking practice.",
  "changed your daily routine":
    " The hardest part of changing a routine is not the new habit itself but the first fortnight, when nothing feels natural yet. I have used the same approach twice since, and knowing that the discomfort is temporary makes it much easier.",
  "shared something with someone":
    " Sharing something you have worked hard for feels risky at first, but in my experience it almost always comes back to you in some form. That is probably the main reason I now volunteer to explain things in team meetings.",
  "changed jobs":
    " Watching her go through it also made me more honest about my own situation. I have since started learning skills outside my current role, so that if I ever want to move, the decision will be a choice rather than a leap.",
  "wait for something important":
    " Now, when I am waiting for something out of my control, I deliberately fill the time rather than watching for news. It does not remove the anxiety completely, but it stops six weeks of waiting from feeling like six weeks of worrying.",
  "gave you a compliment":
    " A vague compliment is forgotten immediately, whereas a specific one can change how somebody sees their own ability. I have also become better at accepting praise instead of dismissing it, which I used to do automatically.",
  "sports event":
    " The game is really just an excuse for a few thousand people to feel the same thing at the same moment. I have watched several matches with the same group since, and I now understand the appeal far better than I did before.",
  "technology helped you":
    " It has not made me lazy about learning languages, but it has made me far more willing to travel somewhere I do not speak the language. On the flight home I even used it to read a newspaper, which was oddly satisfying.",
  "something new you learned recently":
    " Learning something technical changed the way I see an ordinary street. I have also printed a few of the pictures, which I had not done for years, and my parents have put one of them in the living room.",
  "different opinion from an older":
    " Asking about the fear is far more productive than repeating your argument more loudly. I have used the same approach with my younger sister since, and it works in both directions, because her worries were also nothing like what I had assumed.",
  "volunteer or community activity":
    " I have also become far more careful about my own rubbish, because I have seen where it ends up. The other lasting result is that I now know perhaps fifteen neighbours by name, which makes the street feel like an actual community.",
  "major responsibility":
    " The difficult part is not making decisions but accepting that you cannot be certain you have made the right one until much later. Since then I have volunteered for that kind of cover twice, because the discomfort is where most of the learning happens.",
  "presentation you gave":
    " I also learned that the audience wants you to succeed, which is easy to forget when you are standing in front of them. I now volunteer for presentations rather than avoiding them, and each one is noticeably less frightening than the last.",
  "you tried something new":
    " Trying something new usually means being bad at it first, and many people give up during that stage rather than after it. I try to remind myself of that whenever I start something and the early results are disappointing.",
  "changed schools":
    " A simple system of pairing a new student with somebody for the first two weeks would have made an enormous difference to me, and it would cost nothing. I still remember which boy first spoke to me, which shows how much a small gesture matters.",
  "wore formal clothes":
    " That is why I would still do it, even though I would happily never wear a wool jacket in summer again. I have since bought a lighter suit of my own, which was a sensible investment for a country as hot as mine.",
  "interesting information that you learned":
    " If I had simply shared the dramatic version, I would have been spreading something misleading without meaning to. That experience has made me check the original source before passing anything on, which takes two minutes and saves a great deal of embarrassment.",
};

/** Đếm từ như phần validate: tách theo khoảng trắng. */
const wordCount = (text) => text.trim().split(/\s+/).length;

const TOPICS = eval(src.match(/const TOPICS = (\[[\s\S]*?\n\]);/)[1]);

let patched = 0;
let skipped = 0;

for (const [key, extra] of Object.entries(EXTRA)) {
  const topic = TOPICS.find((entry) => entry[0].toLowerCase().includes(key));
  if (!topic) {
    console.error(`KHÔNG TÌM THẤY đề chứa "${key}"`);
    continue;
  }

  const sample = topic[3];
  if (wordCount(sample) >= 180) {
    skipped++;
    continue;
  }
  // Bài mẫu dài và duy nhất trong file, nên khớp trực tiếp là an toàn.
  if (!src.includes(sample)) {
    console.error(`KHÔNG KHỚP trong file: ${topic[0]}`);
    continue;
  }

  src = src.replace(sample, sample + extra);
  patched++;
  console.log(`  ${wordCount(sample)} → ${wordCount(sample + extra)} từ: ${topic[0]}`);
}

fs.writeFileSync(file, src, 'utf8');
console.log(`\nĐã kéo dài ${patched} bài mẫu, bỏ qua ${skipped} bài đã đủ.`);
