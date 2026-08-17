// SINH TỰ ĐỘNG bằng: node scripts/gen-reading-part4-bank.js
// Đừng sửa tay — sửa nguồn JSON rồi chạy lại lệnh trên.
const target = db.getSiblingDB('aptis');
const PART_ID = '16000000-0000-4000-8000-000000000014';
const DOCS = [
 {
  "_id": "b4000000-0000-4000-8000-000000000001",
  "questionSetId": "b4000000-0000-4000-8000-000000000001",
  "revision": 1,
  "schemaVersion": 1,
  "partId": "16000000-0000-4000-8000-000000000014",
  "taskTypeCode": "HEADING_MATCHING",
  "title": "Mountain",
  "instructions": "Đọc bài văn và ghép tiêu đề phù hợp với từng đoạn.",
  "accessLevel": "PREMIUM",
  "stimulus": {
   "format": "PLAIN_TEXT",
   "value": "Topic: Mountain"
  },
  "sections": [],
  "items": [
   {
    "id": "item_1",
    "sequenceNo": 1,
    "prompt": {
     "format": "PLAIN_TEXT",
     "value": "Ghép mỗi đoạn văn với tiêu đề phù hợp."
    },
    "responseType": "MATCHING",
    "required": true,
    "maxScore": 14,
    "options": [],
    "leftItems": [
     {
      "id": "para1",
      "code": "Paragraph A",
      "content": "For centuries, physical features such as height and steepness were the main criteria used to distinguish a mountain from a hill. Yet those measurements do not always settle the question: a modest peak may dominate local history, while a taller one may barely stand out from a plateau. Modern discussions therefore take account of prominence, landscape, local usage, and even the meaning attached to a place by the people who live nearby."
     },
     {
      "id": "para2",
      "code": "Paragraph B",
      "content": "Success in many sports can be measured by a score, a medal, or a finishing time. Reaching a summit is different because the result is inseparable from the climber's private struggle with fear, exhaustion, weather, and self-doubt. Two people may stand on the same peak but experience entirely different journeys. What matters most is often not the altitude itself, but the knowledge that a limit once thought fixed has been surpassed."
     },
     {
      "id": "para3",
      "code": "Paragraph C",
      "content": "A summit photograph once remained in a family album or a climber's personal journal. Today, an ascent may be followed in real time by thousands of viewers, promoted by sponsors, and judged through likes and comments. This exposure can motivate others to attempt difficult goals, but it can also shift attention from the experience itself to the image created around it. The climb becomes something performed for an audience as well as remembered by the individual."
     },
     {
      "id": "para4",
      "code": "Paragraph D",
      "content": "Preparing for a major expedition can demand months of training, substantial savings, and long periods away from home. For some climbers, the next ascent gradually becomes more important than work, family commitments, or financial security. Because determination is widely admired, this imbalance may be praised rather than questioned. The difficulty lies in recognizing when devotion to a demanding goal has stopped enriching life and begun to damage the responsibilities that make ordinary life possible."
     },
     {
      "id": "para5",
      "code": "Paragraph E",
      "content": "People who face danger together often develop loyalty more quickly than those who meet in ordinary settings. Yet a group built around risk can develop its own expectations, making caution appear weak and withdrawal feel like betrayal. Members may encourage one another to continue despite poor weather, fatigue, or inadequate preparation. The same bond that provides trust and support can therefore make it harder for an individual to challenge a reckless decision."
     },
     {
      "id": "para6",
      "code": "Paragraph F",
      "content": "After years of planning expeditions around uncertain weather and seasonal work, some experienced climbers begin to value what they once considered ordinary. A reliable income, regular time with family, and a permanent home may offer a form of satisfaction that constant movement cannot provide. This does not necessarily mean abandoning adventure. Rather, it reflects a shift toward building a life in which occasional risk is supported by dependable routines and long-term commitments."
     },
     {
      "id": "para7",
      "code": "Paragraph G",
      "content": "A difficult ascent can expose qualities that remain hidden in everyday life. Partners must decide whether to share equipment, slow down for one another, admit fear, and accept help without resentment. When these decisions are handled with honesty, the experience can create a level of trust that ordinary social occasions rarely produce. The mountain is important less as a romantic setting than as a demanding environment in which care, patience, and reliability become impossible to fake."
     }
    ],
    "rightItems": [
     {
      "id": "h1",
      "code": "1",
      "content": "Focus on stability"
     },
     {
      "id": "h2",
      "code": "2",
      "content": "Worrying connections"
     },
     {
      "id": "h3",
      "code": "3",
      "content": "Unique sense of achievement"
     },
     {
      "id": "h4",
      "code": "4",
      "content": "Publicity of achievement"
     },
     {
      "id": "h5",
      "code": "5",
      "content": "Misguided priorities"
     },
     {
      "id": "h6",
      "code": "6",
      "content": "Changing the definition of mountain"
     },
     {
      "id": "h7",
      "code": "7",
      "content": "Intimate relationships"
     }
    ],
    "constraints": {
     "pointsPerCorrect": 2
    },
    "rubricCode": null,
    "answerKey": {
     "type": "MATCHING",
     "selectedOptionId": null,
     "selectedOptionIds": [],
     "matches": {
      "para1": "h6",
      "para2": "h3",
      "para3": "h4",
      "para4": "h5",
      "para5": "h2",
      "para6": "h1",
      "para7": "h7"
     },
     "orderedOptionIds": [],
     "acceptedValues": [],
     "caseSensitive": false
    }
   }
  ],
  "assets": [],
  "settings": {
   "shuffleOptions": true,
   "shuffleItems": false,
   "maxAudioPlays": null,
   "showAnswerAfterEachItem": false,
   "allowReview": true
  },
  "scoring": {
   "strategy": "PARTIAL_MATCH",
   "partialCredit": true,
   "maxScore": 14
  }
 },
 {
  "_id": "b4000000-0000-4000-8000-000000000002",
  "questionSetId": "b4000000-0000-4000-8000-000000000002",
  "revision": 1,
  "schemaVersion": 1,
  "partId": "16000000-0000-4000-8000-000000000014",
  "taskTypeCode": "HEADING_MATCHING",
  "title": "Digital innovation",
  "instructions": "Đọc bài văn và ghép tiêu đề phù hợp với từng đoạn.",
  "accessLevel": "PREMIUM",
  "stimulus": {
   "format": "PLAIN_TEXT",
   "value": "Digital"
  },
  "sections": [],
  "items": [
   {
    "id": "item_1",
    "sequenceNo": 1,
    "prompt": {
     "format": "PLAIN_TEXT",
     "value": "Ghép mỗi đoạn văn với tiêu đề phù hợp."
    },
    "responseType": "MATCHING",
    "required": true,
    "maxScore": 14,
    "options": [],
    "leftItems": [
     {
      "id": "para1",
      "code": "Paragraph A",
      "content": "Leisure was once separated fairly clearly from work and study: people left the workplace, met friends, played sport, or settled down with a book. Connected devices have blurred those boundaries. A person may watch a series while replying to colleagues, compete with strangers in an online game, or learn a skill through short videos. Time off has become more personalized and available on demand, but it is also more fragmented and less clearly protected from other obligations."
     },
     {
      "id": "para2",
      "code": "Paragraph B",
      "content": "Distance no longer requires people to wait for a letter or arrange an expensive international call. A family can maintain an ongoing group conversation across several time zones, while colleagues can exchange voice notes, documents, and live video from different countries. These exchanges are not identical to meeting in person, and constant contact can sometimes feel demanding. Even so, portable software has made relationships easier to maintain when regular face-to-face contact is impossible."
     },
     {
      "id": "para3",
      "code": "Paragraph C",
      "content": "Knowing where to tap on a screen is no longer enough for effective participation in modern society. Online users must judge whether a source is reliable, recognize manipulated content, manage passwords, understand what information they are giving away, and communicate without causing harm. These abilities affect schoolwork, employment, banking, and access to public services. People who lack them may own modern devices yet still be excluded from many of the opportunities those devices appear to provide."
     },
     {
      "id": "para4",
      "code": "Paragraph D",
      "content": "Many online services are designed to remove natural stopping points. One episode begins after another, games offer continuous rewards, and feeds supply new content whenever the screen is refreshed. As a result, users may continue far longer than they intended. The cost is not limited to lost time: late-night use can disturb sleep, prolonged sitting replaces movement, and online contact may crowd out richer social experiences. Enjoyment becomes a problem when the design of the service makes moderation unusually difficult."
     },
     {
      "id": "para5",
      "code": "Paragraph E",
      "content": "A weather application may request location access, while a shopping site records searches, purchases, and the time spent viewing each product. Individually, these details can seem harmless; combined over months, they reveal routines, preferences, and likely future behavior. Most users never see the profiles built from this information or the companies with which it is exchanged. The central issue is therefore not simply what people choose to post, but what is gathered quietly while they use ordinary services."
     },
     {
      "id": "para6",
      "code": "Paragraph F",
      "content": "Bringing people from different backgrounds into the same online space does not automatically make that space welcoming. New members may leave when jokes rely on stereotypes, aggressive voices dominate discussion, or reporting systems fail to protect those being targeted. Clear rules, active moderation, accessible features, and a willingness to listen are therefore essential. Diversity can be sustained only when participation feels safe and when disagreement does not become a reason to exclude or humiliate others."
     },
     {
      "id": "para7",
      "code": "Paragraph G",
      "content": "A product may contain advanced technology and still be frustrating to use. Small text, unclear symbols, crowded menus, or steps that depend on perfect vision and movement can turn a simple task into an obstacle. Effective development begins by observing a wide range of users rather than expecting everyone to adapt to the system. When complexity is hidden, instructions are clear, and different abilities are considered, sophisticated tools can feel simple without becoming less powerful."
     }
    ],
    "rightItems": [
     {
      "id": "h1",
      "code": "1",
      "content": "Risks of Excessive Screen-Based Entertainment"
     },
     {
      "id": "h2",
      "code": "2",
      "content": "Redefining Leisure in the Digital era"
     },
     {
      "id": "h3",
      "code": "3",
      "content": "Concerns About Data Privacy"
     },
     {
      "id": "h4",
      "code": "4",
      "content": "Prioritize human-friendly designs"
     },
     {
      "id": "h5",
      "code": "5",
      "content": "Promoting essential digital literacy"
     },
     {
      "id": "h6",
      "code": "6",
      "content": "Enhancing connectivity with mobile apps"
     },
     {
      "id": "h7",
      "code": "7",
      "content": "Building Inclusive and Respectful Online Communities"
     }
    ],
    "constraints": {
     "pointsPerCorrect": 2
    },
    "rubricCode": null,
    "answerKey": {
     "type": "MATCHING",
     "selectedOptionId": null,
     "selectedOptionIds": [],
     "matches": {
      "para1": "h2",
      "para2": "h6",
      "para3": "h5",
      "para4": "h1",
      "para5": "h3",
      "para6": "h7",
      "para7": "h4"
     },
     "orderedOptionIds": [],
     "acceptedValues": [],
     "caseSensitive": false
    }
   }
  ],
  "assets": [],
  "settings": {
   "shuffleOptions": true,
   "shuffleItems": false,
   "maxAudioPlays": null,
   "showAnswerAfterEachItem": false,
   "allowReview": true
  },
  "scoring": {
   "strategy": "PARTIAL_MATCH",
   "partialCredit": true,
   "maxScore": 14
  }
 },
 {
  "_id": "b4000000-0000-4000-8000-000000000003",
  "questionSetId": "b4000000-0000-4000-8000-000000000003",
  "revision": 1,
  "schemaVersion": 1,
  "partId": "16000000-0000-4000-8000-000000000014",
  "taskTypeCode": "HEADING_MATCHING",
  "title": "The Arrival of the Four-Day Work Week",
  "instructions": "Đọc bài văn và ghép tiêu đề phù hợp với từng đoạn.",
  "accessLevel": "PREMIUM",
  "stimulus": {
   "format": "PLAIN_TEXT",
   "value": "Topic: The Arrival of the Four-Day Work Week"
  },
  "sections": [],
  "items": [
   {
    "id": "item_1",
    "sequenceNo": 1,
    "prompt": {
     "format": "PLAIN_TEXT",
     "value": "Ghép mỗi đoạn văn với tiêu đề phù hợp."
    },
    "responseType": "MATCHING",
    "required": true,
    "maxScore": 14,
    "options": [],
    "leftItems": [
     {
      "id": "para1",
      "code": "Paragraph A",
      "content": "The familiar Monday-to-Friday timetable emerged from an industrial world in which output was closely connected to time spent beside a machine. Much contemporary work is organized differently: teams collaborate across locations, software completes routine tasks, and results can matter more than visible attendance. Keeping the same pattern simply because it is familiar may therefore be inefficient. The current debate asks whether a schedule designed for an earlier economy still suits organizations whose work, technology, and employees have changed substantially."
     },
     {
      "id": "para2",
      "code": "Paragraph B",
      "content": "An additional non-working day gives staff room to deal with appointments, domestic tasks, and recovery without using annual leave. Some return with greater concentration because they have had enough time to rest rather than spending the weekend catching up on obligations. Families may also coordinate childcare more easily, and staff gain more control over their lives. These improvements can strengthen morale and reduce the temptation to seek another job, even when total pay remains unchanged."
     },
     {
      "id": "para3",
      "code": "Paragraph C",
      "content": "A reduced schedule does not automatically reduce the number of customers, patients, or calls that an organization must handle. To maintain coverage, an employer may need overlapping teams, additional recruitment, or overtime payments. Smaller firms with narrow profit margins may find these arrangements difficult to absorb. If wages are cut instead, staff carry the cost; if prices rise, customers do. The model can therefore create expenses that are easy to overlook when attention is focused only on its social appeal."
     },
     {
      "id": "para4",
      "code": "Paragraph D",
      "content": "When five days of tasks are compressed into four, the timetable may become more intense rather than more efficient. Meetings are placed closer together, messages accumulate during the extra day off, and delays occur when partner organizations follow a different schedule. Employees who need quiet time for complex work may discover that every available hour has been filled. These effects are not always visible during a short trial, but they can emerge once unusual deadlines, absences, and seasonal demand test the new arrangement."
     },
     {
      "id": "para5",
      "code": "Paragraph E",
      "content": "Changing the calendar is easier than changing assumptions about what a committed employee looks like. Some managers continue to trust people they can see at a desk, while workers may feel guilty for leaving after completing their tasks. Families and transport arrangements are also built around familiar hours. Even when evidence supports a new pattern, routines developed over many years can make it feel risky or improper. Successful adoption therefore depends on changing expectations as well as updating contracts."
     },
     {
      "id": "para6",
      "code": "Paragraph F",
      "content": "A software company may close on Friday with little disruption, but a hospital, hotel, transport service, or shop cannot simply stop serving the public. Employees in these sectors might receive fewer advantages or be asked to work longer shifts while office staff enjoy an extra day away. Differences also arise between salaried and hourly workers. Unless the policy is carefully designed, a reform presented as progress could widen existing divisions between occupations and employment conditions."
     },
     {
      "id": "para7",
      "code": "Paragraph G",
      "content": "Organizations do not have to choose between the traditional timetable and one fixed replacement. Some allow staff to select different days away, others shorten each working day, and certain teams alternate their schedules so that services remain available. Seasonal arrangements may also suit businesses whose workload changes during the year. Testing several models can preserve the advantages of greater control and recovery without forcing every workplace to operate according to a pattern that ignores its particular demands."
     }
    ],
    "rightItems": [
     {
      "id": "h1",
      "code": "1",
      "content": "Benefits for employees"
     },
     {
      "id": "h2",
      "code": "2",
      "content": "Unforeseen challenges for employees"
     },
     {
      "id": "h3",
      "code": "3",
      "content": "A way of life now out of date"
     },
     {
      "id": "h4",
      "code": "4",
      "content": "Undesirable financial consequences"
     },
     {
      "id": "h5",
      "code": "5",
      "content": "Alternative solutions worth considering"
     },
     {
      "id": "h6",
      "code": "6",
      "content": "Unfair for some people"
     },
     {
      "id": "h7",
      "code": "7",
      "content": "Difficult to change old habits"
     }
    ],
    "constraints": {
     "pointsPerCorrect": 2
    },
    "rubricCode": null,
    "answerKey": {
     "type": "MATCHING",
     "selectedOptionId": null,
     "selectedOptionIds": [],
     "matches": {
      "para1": "h3",
      "para2": "h1",
      "para3": "h4",
      "para4": "h2",
      "para5": "h7",
      "para6": "h6",
      "para7": "h5"
     },
     "orderedOptionIds": [],
     "acceptedValues": [],
     "caseSensitive": false
    }
   }
  ],
  "assets": [],
  "settings": {
   "shuffleOptions": true,
   "shuffleItems": false,
   "maxAudioPlays": null,
   "showAnswerAfterEachItem": false,
   "allowReview": true
  },
  "scoring": {
   "strategy": "PARTIAL_MATCH",
   "partialCredit": true,
   "maxScore": 14
  }
 },
 {
  "_id": "b4000000-0000-4000-8000-000000000004",
  "questionSetId": "b4000000-0000-4000-8000-000000000004",
  "revision": 1,
  "schemaVersion": 1,
  "partId": "16000000-0000-4000-8000-000000000014",
  "taskTypeCode": "HEADING_MATCHING",
  "title": "Tech Forward",
  "instructions": "Đọc bài văn và ghép tiêu đề phù hợp với từng đoạn.",
  "accessLevel": "PREMIUM",
  "stimulus": {
   "format": "PLAIN_TEXT",
   "value": "Topic: Tech Forward"
  },
  "sections": [],
  "items": [
   {
    "id": "item_1",
    "sequenceNo": 1,
    "prompt": {
     "format": "PLAIN_TEXT",
     "value": "Ghép mỗi đoạn văn với tiêu đề phù hợp."
    },
    "responseType": "MATCHING",
    "required": true,
    "maxScore": 14,
    "options": [],
    "leftItems": [
     {
      "id": "para1",
      "code": "Paragraph A",
      "content": "Keyboards and touchscreens once defined most contact with digital devices. Increasingly, systems respond to spoken requests, body movement, gaze, and facial expression. These methods can reduce the distance between intention and action: a driver can request directions without looking away from the road, while a person with limited hand movement can control equipment independently. As interfaces become less dependent on technical commands, using a machine begins to resemble communicating with another participant rather than operating a complicated tool."
     },
     {
      "id": "para2",
      "code": "Paragraph B",
      "content": "In many offices, valuable time is consumed by copying information between systems, sorting routine requests, and preparing standard reports. Software can now complete much of this work continuously and with fewer simple errors. The greatest gain does not come merely from doing the same tasks faster. It comes from allowing employees to spend more attention on judgment, design, negotiation, and unusual cases—activities in which experience and creativity matter more than repetition."
     },
     {
      "id": "para3",
      "code": "Paragraph C",
      "content": "Schools once treated computing as a specialist subject for a small group of students. It is now appearing across the curriculum: pupils may program sensors in science, analyze large data sets in geography, or build simple machines in design classes. Such activities teach more than the operation of current devices. They require learners to break problems into steps, test assumptions, and improve a solution after failure, preparing them for occupations that may not yet have familiar names."
     },
     {
      "id": "para4",
      "code": "Paragraph D",
      "content": "Convenient interfaces reduce effort, but they can also remove useful forms of practice. Navigation software may weaken people's awareness of their surroundings, automatic suggestions can replace careful writing, and constant switching between notifications makes sustained attention harder. The concern is not that screens are inherently harmful. It is that handing every small decision to a device may gradually reduce confidence and ability when the device is absent, inaccurate, or unable to understand an unfamiliar situation."
     },
     {
      "id": "para5",
      "code": "Paragraph E",
      "content": "A public service may move online because digital delivery is cheaper and faster for most citizens. Yet the change can disadvantage households with unreliable connections, shared phones, limited data, or little confidence using formal websites. The same barrier affects applications for work, access to lessons, and medical appointments. Providing a device alone is rarely sufficient; affordable connections, accessible services, technical support, and safe places to use them are all necessary if technological progress is not to deepen existing inequality."
     },
     {
      "id": "para6",
      "code": "Paragraph F",
      "content": "Many successful projects begin outside formal companies or universities. Enthusiasts meet in local workshops, online forums, or volunteer groups to exchange code, lend equipment, and challenge one another's ideas. A beginner may receive guidance from an experienced engineer, while a researcher discovers an unexpected use for an unfinished prototype. These networks are valuable because knowledge moves freely across occupations and age groups, allowing promising ideas to develop before they attract money or institutional support."
     },
     {
      "id": "para7",
      "code": "Paragraph G",
      "content": "The environmental cost of a digital product is often hidden behind its clean screen. Devices require mined materials, data centers consume large amounts of electricity, and frequent upgrades create difficult waste. Some firms are responding by extending software support, designing products that can be repaired, reusing components, and powering infrastructure with lower-carbon energy. The aim is not to stop technological progress, but to judge innovation partly by how long it lasts and what resources it consumes throughout its life."
     }
    ],
    "rightItems": [
     {
      "id": "h1",
      "code": "1",
      "content": "Enhancing productivity through smart automation"
     },
     {
      "id": "h2",
      "code": "2",
      "content": "Overreliance on digital interfaces"
     },
     {
      "id": "h3",
      "code": "3",
      "content": "Promoting tech-driven education programs"
     },
     {
      "id": "h4",
      "code": "4",
      "content": "Redefining human-technology interaction"
     },
     {
      "id": "h5",
      "code": "5",
      "content": "Concerns about technology access disparities"
     },
     {
      "id": "h6",
      "code": "6",
      "content": "Building innovative tech communities"
     },
     {
      "id": "h7",
      "code": "7",
      "content": "Focusing on sustainable digital solutions"
     }
    ],
    "constraints": {
     "pointsPerCorrect": 2
    },
    "rubricCode": null,
    "answerKey": {
     "type": "MATCHING",
     "selectedOptionId": null,
     "selectedOptionIds": [],
     "matches": {
      "para1": "h4",
      "para2": "h1",
      "para3": "h3",
      "para4": "h2",
      "para5": "h5",
      "para6": "h6",
      "para7": "h7"
     },
     "orderedOptionIds": [],
     "acceptedValues": [],
     "caseSensitive": false
    }
   }
  ],
  "assets": [],
  "settings": {
   "shuffleOptions": true,
   "shuffleItems": false,
   "maxAudioPlays": null,
   "showAnswerAfterEachItem": false,
   "allowReview": true
  },
  "scoring": {
   "strategy": "PARTIAL_MATCH",
   "partialCredit": true,
   "maxScore": 14
  }
 },
 {
  "_id": "b4000000-0000-4000-8000-000000000005",
  "questionSetId": "b4000000-0000-4000-8000-000000000005",
  "revision": 1,
  "schemaVersion": 1,
  "partId": "16000000-0000-4000-8000-000000000014",
  "taskTypeCode": "HEADING_MATCHING",
  "title": "Consumer",
  "instructions": "Đọc bài văn và ghép tiêu đề phù hợp với từng đoạn.",
  "accessLevel": "PREMIUM",
  "stimulus": {
   "format": "PLAIN_TEXT",
   "value": "Topic: Consumer"
  },
  "sections": [],
  "items": [
   {
    "id": "item_1",
    "sequenceNo": 1,
    "prompt": {
     "format": "PLAIN_TEXT",
     "value": "Ghép mỗi đoạn văn với tiêu đề phù hợp."
    },
    "responseType": "MATCHING",
    "required": true,
    "maxScore": 14,
    "options": [],
    "leftItems": [
     {
      "id": "para1",
      "code": "Paragraph A",
      "content": "In today's modern consumer age, people tend to own more than they used to. A worker only has 5-6 pairs of shoes in his entire life. And he will repair them when they break or wear out, not throw them away. Nowadays, if we have a phone, it is expected that you will use such electronic devices throughout your life."
     },
     {
      "id": "para2",
      "code": "Paragraph B",
      "content": "Mrs. Judith Levine - a journalist and her husband decided to change their lifestyle to be as minimalist as possible. They only buy what is absolutely necessary, such as food for work. They do not go to the cinema, cafes, restaurants. As a writer, I can say that she is saving for a purpose of publishing her findings as a book."
     },
     {
      "id": "para3",
      "code": "Paragraph C",
      "content": "To make this experiment as realistic as possible, Ms. Levine and her husband decided not to tell anyone, because they knew that once their friends knew about this plan, they would mention the issue of paying for the couple's share when they went out together. Therefore, the couple was determined to keep it a secret from friends, family and strangers."
     },
     {
      "id": "para4",
      "code": "Paragraph D",
      "content": "Published in 2006, the book Not Buying It when reread 10 years later still holds its value. They believe that journalist Ms. Levine has the ability to predict future consumer trends. The minimalist lifestyle she mentioned has become a trend today."
     },
     {
      "id": "para5",
      "code": "Paragraph E",
      "content": "The couple wanted to buy a gift as a gift. However, that went against their point of not buying unnecessary things. And they decided to make it themselves to have a lower spending level. However, none of them have any aesthetic talent, so they finally decided to give a meaningful and practical gift to the recipient, which is a piece of their jewelry."
     },
     {
      "id": "para6",
      "code": "Paragraph F",
      "content": "Ms. Levine does not have an office, which is quite inconvenient when she has to meet partners in a coffee shop. When working alone, she often goes to the public library and finds it very convenient."
     },
     {
      "id": "para7",
      "code": "Paragraph G",
      "content": "Lessons about minimalism in today's consumer trends: buy things that are really necessary, switch from driving cars and motorbikes to cycling and walking."
     }
    ],
    "rightItems": [
     {
      "id": "h1",
      "code": "1",
      "content": "Still relevant to our times"
     },
     {
      "id": "h2",
      "code": "2",
      "content": "Reason to reach a compromise"
     },
     {
      "id": "h3",
      "code": "3",
      "content": "Making things last longer"
     },
     {
      "id": "h4",
      "code": "4",
      "content": "The difficulty of being generous"
     },
     {
      "id": "h5",
      "code": "5",
      "content": "The reason of secrecy"
     },
     {
      "id": "h6",
      "code": "6",
      "content": "A temporary experiment"
     },
     {
      "id": "h7",
      "code": "7",
      "content": "Important lessons for all of us"
     }
    ],
    "constraints": {
     "pointsPerCorrect": 2
    },
    "rubricCode": null,
    "answerKey": {
     "type": "MATCHING",
     "selectedOptionId": null,
     "selectedOptionIds": [],
     "matches": {
      "para1": "h3",
      "para2": "h6",
      "para3": "h5",
      "para4": "h1",
      "para5": "h4",
      "para6": "h2",
      "para7": "h7"
     },
     "orderedOptionIds": [],
     "acceptedValues": [],
     "caseSensitive": false
    }
   }
  ],
  "assets": [],
  "settings": {
   "shuffleOptions": true,
   "shuffleItems": false,
   "maxAudioPlays": null,
   "showAnswerAfterEachItem": false,
   "allowReview": true
  },
  "scoring": {
   "strategy": "PARTIAL_MATCH",
   "partialCredit": true,
   "maxScore": 14
  }
 },
 {
  "_id": "b4000000-0000-4000-8000-000000000006",
  "questionSetId": "b4000000-0000-4000-8000-000000000006",
  "revision": 1,
  "schemaVersion": 1,
  "partId": "16000000-0000-4000-8000-000000000014",
  "taskTypeCode": "HEADING_MATCHING",
  "title": "Wellness Trends",
  "instructions": "Đọc bài văn và ghép tiêu đề phù hợp với từng đoạn.",
  "accessLevel": "PREMIUM",
  "stimulus": {
   "format": "PLAIN_TEXT",
   "value": "Topic: Wellness Trends"
  },
  "sections": [],
  "items": [
   {
    "id": "item_1",
    "sequenceNo": 1,
    "prompt": {
     "format": "PLAIN_TEXT",
     "value": "Ghép mỗi đoạn văn với tiêu đề phù hợp."
    },
    "responseType": "MATCHING",
    "required": true,
    "maxScore": 14,
    "options": [],
    "leftItems": [
     {
      "id": "para1",
      "code": "Paragraph A",
      "content": "A person may follow an excellent exercise plan and still feel unwell because of persistent stress, poor sleep, isolation, or an unsuitable working environment. Treating each complaint separately can miss the way these factors influence one another. A broader view examines daily routines, emotional pressures, relationships, nutrition, and surroundings alongside physical symptoms. Its value lies less in offering one universal cure than in understanding why several modest changes, made together, may produce a more lasting improvement."
     },
     {
      "id": "para2",
      "code": "Paragraph B",
      "content": "Silence surrounding anxiety, depression, and severe stress often delays assistance until problems interfere with work, study, or relationships. Public campaigns, classroom discussions, and personal accounts can make the subject easier to name without shame. Their purpose is not to encourage casual self-diagnosis, but to help people notice warning signs, respond compassionately, and know where professional support is available. Earlier conversation can prevent isolation and make seeking help appear responsible rather than exceptional."
     },
     {
      "id": "para3",
      "code": "Paragraph C",
      "content": "Exercise advice is easy to give but difficult to follow when activity feels lonely, expensive, or disconnected from daily life. Walking groups, public dance sessions, neighborhood sports, and low-cost classes change that experience by adding routine and companionship. Participants often return because others expect them, not because their motivation is always strong. In this setting, movement becomes a social habit rather than a private test of willpower, making continued participation more likely among people who would not join a conventional gym."
     },
     {
      "id": "para4",
      "code": "Paragraph D",
      "content": "Popular eating plans often gain attention by identifying one ingredient as the cause of poor health and promising rapid results when it is removed. Early weight loss may reinforce the claim, even when it mainly reflects water loss or a temporary reduction in calories. Over time, strict rules can create nutrient gaps, anxiety about food, and repeated cycles of failure. A less dramatic approach—varied meals, appropriate portions, and habits suited to the individual—is usually harder to advertise but easier to maintain."
     },
     {
      "id": "para5",
      "code": "Paragraph E",
      "content": "Advice about health travels quickly online because personal stories are more memorable than cautious scientific explanations. A confident influencer may recommend a supplement after one positive experience, while an alarming video presents coincidence as proof of harm. Repetition can make such claims appear established even when supporting evidence is weak. Readers therefore need to check who produced the information, whether independent research agrees, and whether a qualified professional should be consulted before the advice changes treatment or diet."
     },
     {
      "id": "para6",
      "code": "Paragraph F",
      "content": "Long-term change rarely follows a smooth path. Someone trying to sleep better, exercise regularly, or recover from illness may lose motivation after a setback and assume that previous progress has been wasted. Groups of people facing similar challenges can provide perspective, practical suggestions, and a reason to continue. Their most useful contribution is often not expert instruction but the reassurance that difficulties are normal and that improvement can be measured over months rather than judged by a single bad week."
     },
     {
      "id": "para7",
      "code": "Paragraph G",
      "content": "Dramatic resolutions often disappear once the initial excitement fades. A routine is more likely to survive when it fits ordinary life: a slightly earlier bedtime, meals that can be prepared on busy days, short periods of movement, and realistic methods of handling pressure. These changes may seem too small to produce immediate transformation, yet their effects accumulate because they can be repeated. Lasting health is usually built through adjustments that remain possible during stressful as well as ideal weeks."
     }
    ],
    "rightItems": [
     {
      "id": "h1",
      "code": "1",
      "content": "Encouraging community fitness programs"
     },
     {
      "id": "h2",
      "code": "2",
      "content": "Overemphasis on trendy diets"
     },
     {
      "id": "h3",
      "code": "3",
      "content": "Focusing on sustainable lifestyle changes"
     },
     {
      "id": "h4",
      "code": "4",
      "content": "Redefining holistic health approaches"
     },
     {
      "id": "h5",
      "code": "5",
      "content": "Building supportive health communities"
     },
     {
      "id": "h6",
      "code": "6",
      "content": "Concerns about wellness misinformation"
     },
     {
      "id": "h7",
      "code": "7",
      "content": "Promoting mental health awareness"
     }
    ],
    "constraints": {
     "pointsPerCorrect": 2
    },
    "rubricCode": null,
    "answerKey": {
     "type": "MATCHING",
     "selectedOptionId": null,
     "selectedOptionIds": [],
     "matches": {
      "para1": "h4",
      "para2": "h7",
      "para3": "h1",
      "para4": "h2",
      "para5": "h6",
      "para6": "h5",
      "para7": "h3"
     },
     "orderedOptionIds": [],
     "acceptedValues": [],
     "caseSensitive": false
    }
   }
  ],
  "assets": [],
  "settings": {
   "shuffleOptions": true,
   "shuffleItems": false,
   "maxAudioPlays": null,
   "showAnswerAfterEachItem": false,
   "allowReview": true
  },
  "scoring": {
   "strategy": "PARTIAL_MATCH",
   "partialCredit": true,
   "maxScore": 14
  }
 },
 {
  "_id": "b4000000-0000-4000-8000-000000000007",
  "questionSetId": "b4000000-0000-4000-8000-000000000007",
  "revision": 1,
  "schemaVersion": 1,
  "partId": "16000000-0000-4000-8000-000000000014",
  "taskTypeCode": "HEADING_MATCHING",
  "title": "Women Mathematicians",
  "instructions": "Đọc bài văn và ghép tiêu đề phù hợp với từng đoạn.",
  "accessLevel": "PREMIUM",
  "stimulus": {
   "format": "PLAIN_TEXT",
   "value": "Topic: Women Mathematicians"
  },
  "sections": [],
  "items": [
   {
    "id": "item_1",
    "sequenceNo": 1,
    "prompt": {
     "format": "PLAIN_TEXT",
     "value": "Ghép mỗi đoạn văn với tiêu đề phù hợp."
    },
    "responseType": "MATCHING",
    "required": true,
    "maxScore": 14,
    "options": [],
    "leftItems": [
     {
      "id": "para1",
      "code": "Paragraph A",
      "content": "For centuries, the achievements of women in mathematics were either omitted from historical records or attributed to male colleagues. Hypatia of Alexandria, one of the earliest known female mathematicians, was respected in her time, yet many of her contributions were later credited to male scholars. Such erasure has been a recurring theme in the history of women in this field."
     },
     {
      "id": "para2",
      "code": "Paragraph B",
      "content": "Emmy Noether, often described as the most important woman in the history of mathematics, revolutionized abstract algebra and theoretical physics. Albert Einstein referred to her work as \"the very expression of the spirit of modern algebra.\" Only recently has her legacy gained the widespread recognition it deserves, demonstrating a growing effort to acknowledge those once overlooked."
     },
     {
      "id": "para3",
      "code": "Paragraph C",
      "content": "In many historical accounts, the success of male mathematicians has overshadowed the collaborative efforts of their female peers. For example, the development of chaos theory often credits Edward Lorenz, yet contributions by female mathematicians working in the same field are frequently omitted from textbooks and academic narratives."
     },
     {
      "id": "para4",
      "code": "Paragraph D",
      "content": "Mary Cartwright had a mathematical career spanning over six decades. Her work in nonlinear differential equations laid the groundwork for chaos theory, influencing both mathematics and engineering. Despite the challenges faced by women in academia during her time, she maintained a consistent output of high-quality research throughout her life."
     },
     {
      "id": "para5",
      "code": "Paragraph E",
      "content": "When female mathematicians are described as \"women geniuses\" or \"female prodigies,\" the gender label, while well-intended, often implies that excellence is rare among women. Such terms, though celebratory, can unintentionally reinforce the idea that women's success in mathematics is unusual, rather than simply the result of talent and hard work."
     },
     {
      "id": "para6",
      "code": "Paragraph F",
      "content": "To address the gender imbalance in mathematics, many universities and organizations now run outreach programs, offer scholarships specifically for women, and encourage female mentorship in STEM fields. These efforts aim not to give unfair advantage, but to create equal opportunities in a domain where women have historically been underrepresented."
     },
     {
      "id": "para7",
      "code": "Paragraph G",
      "content": "In efforts to level the playing field, some institutions have implemented standardized criteria for admissions or research evaluation. However, such uniform methods can sometimes ignore the diverse paths and challenges faced by individuals, particularly women balancing academic and societal expectations. A one-size-fits-all approach may not always foster true equity."
     }
    ],
    "rightItems": [
     {
      "id": "h1",
      "code": "1",
      "content": "Gender obscure achievements"
     },
     {
      "id": "h2",
      "code": "2",
      "content": "A long career showing exceptional ability"
     },
     {
      "id": "h3",
      "code": "3",
      "content": "Uniformity is not always beneficial"
     },
     {
      "id": "h4",
      "code": "4",
      "content": "Acknowledging achievement of a pioneer"
     },
     {
      "id": "h5",
      "code": "5",
      "content": "Attempting to create a gender balance"
     },
     {
      "id": "h6",
      "code": "6",
      "content": "Labels can change perspective on people"
     },
     {
      "id": "h7",
      "code": "7",
      "content": "Man unfairly credited"
     }
    ],
    "constraints": {
     "pointsPerCorrect": 2
    },
    "rubricCode": null,
    "answerKey": {
     "type": "MATCHING",
     "selectedOptionId": null,
     "selectedOptionIds": [],
     "matches": {
      "para1": "h1",
      "para2": "h4",
      "para3": "h7",
      "para4": "h2",
      "para5": "h6",
      "para6": "h5",
      "para7": "h3"
     },
     "orderedOptionIds": [],
     "acceptedValues": [],
     "caseSensitive": false
    }
   }
  ],
  "assets": [],
  "settings": {
   "shuffleOptions": true,
   "shuffleItems": false,
   "maxAudioPlays": null,
   "showAnswerAfterEachItem": false,
   "allowReview": true
  },
  "scoring": {
   "strategy": "PARTIAL_MATCH",
   "partialCredit": true,
   "maxScore": 14
  }
 },
 {
  "_id": "b4000000-0000-4000-8000-000000000008",
  "questionSetId": "b4000000-0000-4000-8000-000000000008",
  "revision": 1,
  "schemaVersion": 1,
  "partId": "16000000-0000-4000-8000-000000000014",
  "taskTypeCode": "HEADING_MATCHING",
  "title": "Eating",
  "instructions": "Đọc bài văn và ghép tiêu đề phù hợp với từng đoạn.",
  "accessLevel": "PREMIUM",
  "stimulus": {
   "format": "PLAIN_TEXT",
   "value": "Topic: Eating"
  },
  "sections": [],
  "items": [
   {
    "id": "item_1",
    "sequenceNo": 1,
    "prompt": {
     "format": "PLAIN_TEXT",
     "value": "Ghép mỗi đoạn văn với tiêu đề phù hợp."
    },
    "responseType": "MATCHING",
    "required": true,
    "maxScore": 14,
    "options": [],
    "leftItems": [
     {
      "id": "para1",
      "code": "Paragraph A",
      "content": "Chinese culinary culture is like most other cultures in the world. It started with very basic hunting and gathering. Over time, society gradually developed, and with it, culinary culture developed. Gradually, cuisine became an art form and seemed to reach its peak in the 19th century. Although most Chinese people choose simple food with rice and vegetables, it is undeniable that Chinese culinary art has reached the level of exploiting the maximum flavor and each ingredient."
     },
     {
      "id": "para2",
      "code": "Paragraph B",
      "content": "The concept of yin and yang has a complex influence on Chinese cuisine. In fact, this concept also appears in many other areas of life. It can be understood that yin and yang are opposite elements that complement each other to achieve a certain balance. Sweet and sour, cold and hot are typical examples of this concept. Some foods can be classified into hot or cold groups, such as lemon is considered cold and onion is considered hot. Based on this concept, Chinese people choose suitable foods to maintain the balance of the body."
     },
     {
      "id": "para3",
      "code": "Paragraph C",
      "content": "In addition to the concept of yin and yang directly influencing the culinary culture, the Chinese also pay close attention to the availability of ingredients. Each region has its own ingredients, and this leads to differences in regional cooking styles. The coastal areas in the south of the country are famous for seafood dishes. In the north, the widespread cultivation of wheat has led to noodle dishes. The southwestern regions are famous for spicy soups, while some regions are famous for grilled meat."
     },
     {
      "id": "para4",
      "code": "Paragraph D",
      "content": "Cooking methods are also regionally specific, in addition to the differences in food in these regions. However, there are some food techniques that are considered to be standard in Chinese culture. For example, vegetables are cut into small pieces and eaten with chopsticks. The Chinese have a long history of using chopsticks. The Chinese also often leave fish and meat with bones. According to them, this makes the food more delicious. Steaming is a very popular form of cooking. In addition, frying food with cooking oil is also commonly used."
     },
     {
      "id": "para5",
      "code": "Paragraph E",
      "content": "The most common way for Chinese people to eat is street food. It is very common to see stalls selling all kinds of food on both sides of the road. This has become a part of the food culture. For large dining events, the food is often placed in the middle of the table so that guests can try different dishes. The meal is served with tea and sometimes rice wine from the local area."
     },
     {
      "id": "para6",
      "code": "Paragraph F",
      "content": "There are signs that Chinese food culture and eating habits are changing. Chinese people now consume a wide variety of foods from many different countries. People in cities also prefer fast and convenient foods. In addition, some traditional products such as milk are consumed less by Chinese people than in the past."
     },
     {
      "id": "para7",
      "code": "Paragraph G",
      "content": "The change in Chinese eating habits has a global impact. Due to its huge population, the food demand of the Chinese market will directly affect domestic and international food production. The change in diet leads to problems such as the increase in related diseases that a large economy like China is prone to. Therefore, achieving a balance like the yin-yang philosophy in Chinese culinary culture is clearly a big challenge."
     }
    ],
    "rightItems": [
     {
      "id": "h1",
      "code": "1",
      "content": "Effects of a changing diet"
     },
     {
      "id": "h2",
      "code": "2",
      "content": "The influence of philosophy"
     },
     {
      "id": "h3",
      "code": "3",
      "content": "Regional variations"
     },
     {
      "id": "h4",
      "code": "4",
      "content": "Cooking methods"
     },
     {
      "id": "h5",
      "code": "5",
      "content": "The origins of chinese food"
     },
     {
      "id": "h6",
      "code": "6",
      "content": "The style of eating"
     },
     {
      "id": "h7",
      "code": "7",
      "content": "Changes in the Chinese diets"
     }
    ],
    "constraints": {
     "pointsPerCorrect": 2
    },
    "rubricCode": null,
    "answerKey": {
     "type": "MATCHING",
     "selectedOptionId": null,
     "selectedOptionIds": [],
     "matches": {
      "para1": "h5",
      "para2": "h2",
      "para3": "h3",
      "para4": "h4",
      "para5": "h6",
      "para6": "h7",
      "para7": "h1"
     },
     "orderedOptionIds": [],
     "acceptedValues": [],
     "caseSensitive": false
    }
   }
  ],
  "assets": [],
  "settings": {
   "shuffleOptions": true,
   "shuffleItems": false,
   "maxAudioPlays": null,
   "showAnswerAfterEachItem": false,
   "allowReview": true
  },
  "scoring": {
   "strategy": "PARTIAL_MATCH",
   "partialCredit": true,
   "maxScore": 14
  }
 },
 {
  "_id": "b4000000-0000-4000-8000-000000000009",
  "questionSetId": "b4000000-0000-4000-8000-000000000009",
  "revision": 1,
  "schemaVersion": 1,
  "partId": "16000000-0000-4000-8000-000000000014",
  "taskTypeCode": "HEADING_MATCHING",
  "title": "Frozen land",
  "instructions": "Đọc bài văn và ghép tiêu đề phù hợp với từng đoạn.",
  "accessLevel": "PREMIUM",
  "stimulus": {
   "format": "PLAIN_TEXT",
   "value": "Topic: Frozen land"
  },
  "sections": [],
  "items": [
   {
    "id": "item_1",
    "sequenceNo": 1,
    "prompt": {
     "format": "PLAIN_TEXT",
     "value": "Ghép mỗi đoạn văn với tiêu đề phù hợp."
    },
    "responseType": "MATCHING",
    "required": true,
    "maxScore": 14,
    "options": [],
    "leftItems": [
     {
      "id": "para1",
      "code": "Paragraph A",
      "content": "Although Antarctica is not claimed as a country, several nations have laid territorial claims over parts of the continent. However, under the Antarctic Treaty System signed in 1959, no single country has full ownership. Instead, the region is governed collectively by over 50 countries that have agreed to preserve it for peaceful and scientific purposes. No military activity is allowed, and scientific cooperation is encouraged. This unique model of international governance helps protect the fragile environment of the frozen land and ensures that its resources are not exploited for commercial gain."
     },
     {
      "id": "para2",
      "code": "Paragraph B",
      "content": "The first known landing on Antarctica took place in the early 19th century when a group of seal hunters unintentionally arrived at the icy coastline. Later, exploratory missions were organized specifically to set foot on the continent. In 1895, a Norwegian expedition became the first officially recognized landing. These early steps were dangerous and uncertain, with little knowledge of the terrain or weather. Still, the achievement marked a turning point in human exploration, showing that even the most remote and inhospitable places on Earth could be reached with courage and persistence."
     },
     {
      "id": "para3",
      "code": "Paragraph C",
      "content": "Antarctica has often been described as the end of the Earth. Located at the southernmost point of the planet, it remains one of the most mysterious and least accessible places for humans. It's surrounded by the Southern Ocean and sits opposite the Arctic in the global geography. For centuries, explorers speculated whether such a place existed at all. Today, while satellite images and scientific missions provide more data, the continent still retains an aura of the unknown, attracting adventurers and scientists who want to experience the planet's final frontier."
     },
     {
      "id": "para4",
      "code": "Paragraph D",
      "content": "Despite being covered in thick sheets of ice, Antarctica has a surprisingly diverse and dramatic landscape hidden beneath its surface. Using ground-penetrating radar and satellite imaging, scientists have discovered vast mountain ranges, deep valleys, and even ancient lakes buried under kilometers of ice. These findings suggest that Antarctica was once a very different environment. Studying this hidden geography helps researchers understand the Earth's geological past, as well as how changes in climate may affect the region's ice coverage in the future."
     },
     {
      "id": "para5",
      "code": "Paragraph E",
      "content": "The early 20th century saw a dramatic competition between nations to reach the South Pole. Most famously, British explorer Robert Falcon Scott and Norwegian Roald Amundsen led rival expeditions. Amundsen reached the Pole first in 1911, using dog sleds and careful planning. Scott arrived weeks later, only to perish on the return journey with his team. The race to the pole was one of the most extreme tests of human endurance and remains one of the most iconic chapters in the history of polar exploration."
     },
     {
      "id": "para6",
      "code": "Paragraph F",
      "content": "Travel across Antarctica remains one of the most difficult journeys on Earth. However, modern technology has significantly reduced the physical effort required. In the past, explorers dragged heavy sleds by hand or used animals, often in dangerous and freezing conditions. Today, snowmobiles, tracked vehicles, and even aircraft allow researchers to move equipment and people more easily. While the environment is still harsh, advances in transportation and survival gear make scientific missions more efficient and less life-threatening than those of early explorers."
     },
     {
      "id": "para7",
      "code": "Paragraph G",
      "content": "Antarctica is the coldest place on Earth, with temperatures regularly dropping below –60°C in winter. The continent's high altitude, its position near the South Pole, and the fact that sunlight is absent for months all contribute to its extreme chill. Its white ice surface also reflects most of the sun's heat back into the atmosphere. These unique features make it difficult for heat to accumulate, and as a result, the region remains frozen even in summer. Understanding these conditions helps scientists study global weather patterns and climate change."
     }
    ],
    "rightItems": [
     {
      "id": "h1",
      "code": "1",
      "content": "Less effort needed"
     },
     {
      "id": "h2",
      "code": "2",
      "content": "Why is it so cold?"
     },
     {
      "id": "h3",
      "code": "3",
      "content": "Where is the end of the Earth?"
     },
     {
      "id": "h4",
      "code": "4",
      "content": "First step on the ice"
     },
     {
      "id": "h5",
      "code": "5",
      "content": "The hidden landscape beneath the ice"
     },
     {
      "id": "h6",
      "code": "6",
      "content": "Who is in charge?"
     },
     {
      "id": "h7",
      "code": "7",
      "content": "Race to the pole"
     }
    ],
    "constraints": {
     "pointsPerCorrect": 2
    },
    "rubricCode": null,
    "answerKey": {
     "type": "MATCHING",
     "selectedOptionId": null,
     "selectedOptionIds": [],
     "matches": {
      "para1": "h6",
      "para2": "h4",
      "para3": "h3",
      "para4": "h5",
      "para5": "h7",
      "para6": "h1",
      "para7": "h2"
     },
     "orderedOptionIds": [],
     "acceptedValues": [],
     "caseSensitive": false
    }
   }
  ],
  "assets": [],
  "settings": {
   "shuffleOptions": true,
   "shuffleItems": false,
   "maxAudioPlays": null,
   "showAnswerAfterEachItem": false,
   "allowReview": true
  },
  "scoring": {
   "strategy": "PARTIAL_MATCH",
   "partialCredit": true,
   "maxScore": 14
  }
 },
 {
  "_id": "b4000000-0000-4000-8000-000000000010",
  "questionSetId": "b4000000-0000-4000-8000-000000000010",
  "revision": 1,
  "schemaVersion": 1,
  "partId": "16000000-0000-4000-8000-000000000014",
  "taskTypeCode": "HEADING_MATCHING",
  "title": "Meatless",
  "instructions": "Đọc bài văn và ghép tiêu đề phù hợp với từng đoạn.",
  "accessLevel": "PREMIUM",
  "stimulus": {
   "format": "PLAIN_TEXT",
   "value": "Topic: Meatless"
  },
  "sections": [],
  "items": [
   {
    "id": "item_1",
    "sequenceNo": 1,
    "prompt": {
     "format": "PLAIN_TEXT",
     "value": "Ghép mỗi đoạn văn với tiêu đề phù hợp."
    },
    "responseType": "MATCHING",
    "required": true,
    "maxScore": 14,
    "options": [],
    "leftItems": [
     {
      "id": "para1",
      "code": "Paragraph A",
      "content": "Vegetarianism is not a single dietary choice but includes many different forms. Some vegetarians avoid meat but still eat dairy and eggs—these are called lacto-ovo vegetarians. Others, like vegans, avoid all animal-derived products, including honey and gelatin. There are also pescatarians, who exclude meat but still consume fish. Flexitarians mostly eat plant-based foods but occasionally include meat or fish. These variations show that a meatless diet can be adapted to individual needs and beliefs, making it a flexible and increasingly popular choice for people around the world."
     },
     {
      "id": "para2",
      "code": "Paragraph B",
      "content": "People adopt meatless diets for many different reasons. For some, religious beliefs guide their eating habits, while others avoid meat out of concern for animal welfare. Some are motivated by environmental issues, believing that reducing meat consumption lowers their carbon footprint. Health is also a major factor, as some studies link vegetarian diets to lower risks of heart disease and diabetes. The motivations are as varied as the people who choose them, and it's not uncommon for individuals to follow a plant-based lifestyle for a combination of reasons."
     },
     {
      "id": "para3",
      "code": "Paragraph C",
      "content": "Many people wonder if it's truly possible to live without eating meat. The answer is yes, as proven by millions of vegetarians and vegans worldwide. While it requires some planning to ensure a balanced intake of protein, iron, and vitamin B12, plant-based diets can be nutritionally complete. In fact, major health organizations have stated that well-planned vegetarian and vegan diets are suitable for all stages of life, including childhood and pregnancy. With a variety of plant-based options now available, choosing a meatless lifestyle is more practical than ever."
     },
     {
      "id": "para4",
      "code": "Paragraph D",
      "content": "Factory farming—the industrialized method of raising animals for food—has been criticized for its negative effects on both animals and the environment. Animals are often kept in cramped, stressful conditions, and the use of antibiotics to promote growth raises concerns about resistance. Additionally, factory farms contribute to pollution and greenhouse gas emissions. These harmful impacts are among the key reasons why some people choose to reduce or eliminate meat from their diet. Supporting ethical and sustainable food sources is becoming a growing priority for many consumers."
     },
     {
      "id": "para5",
      "code": "Paragraph E",
      "content": "At the core of many vegetarian beliefs is the idea of respecting all forms of life. For some, avoiding meat is a moral decision rooted in the belief that animals have the right to live without suffering. This perspective emphasizes empathy, compassion, and non-violence. It is also reflected in certain spiritual or religious practices where harming living beings is discouraged. Choosing a meatless diet becomes more than just a personal choice—it represents a commitment to treating all creatures with dignity and care."
     },
     {
      "id": "para6",
      "code": "Paragraph F",
      "content": "A common benefit reported by people who switch to a plant-based diet is improved health. Many experience lower cholesterol levels, better digestion, and increased energy. Vegetarian diets are often rich in fiber, antioxidants, and healthy fats. Studies show that people who consume more fruits, vegetables, whole grains, and legumes tend to have lower risks of heart disease and obesity. However, balance is key—a diet full of processed plant foods can still be unhealthy. When done right, a meatless diet can be a strong foundation for a healthy lifestyle."
     },
     {
      "id": "para7",
      "code": "Paragraph G",
      "content": "Reducing meat consumption can also be seen as a global responsibility. Livestock farming is a major contributor to climate change, water usage, and deforestation. By choosing plant-based options, individuals can lower their environmental impact and support a more sustainable food system. Small changes made by many people can have a big collective effect. From conserving water to reducing greenhouse gas emissions, a meatless diet can be a meaningful step toward addressing some of the planet’s most urgent environmental challenges."
     }
    ],
    "rightItems": [
     {
      "id": "h1",
      "code": "1",
      "content": "Factory farming - it is a harmful thing"
     },
     {
      "id": "h2",
      "code": "2",
      "content": "Types of Vegetarian"
     },
     {
      "id": "h3",
      "code": "3",
      "content": "Various explanations"
     },
     {
      "id": "h4",
      "code": "4",
      "content": "Possible to happen"
     },
     {
      "id": "h5",
      "code": "5",
      "content": "Respect the life"
     },
     {
      "id": "h6",
      "code": "6",
      "content": "Our responsibilities for global"
     },
     {
      "id": "h7",
      "code": "7",
      "content": "Health gets better with diet"
     }
    ],
    "constraints": {
     "pointsPerCorrect": 2
    },
    "rubricCode": null,
    "answerKey": {
     "type": "MATCHING",
     "selectedOptionId": null,
     "selectedOptionIds": [],
     "matches": {
      "para1": "h2",
      "para2": "h3",
      "para3": "h4",
      "para4": "h1",
      "para5": "h5",
      "para6": "h7",
      "para7": "h6"
     },
     "orderedOptionIds": [],
     "acceptedValues": [],
     "caseSensitive": false
    }
   }
  ],
  "assets": [],
  "settings": {
   "shuffleOptions": true,
   "shuffleItems": false,
   "maxAudioPlays": null,
   "showAnswerAfterEachItem": false,
   "allowReview": true
  },
  "scoring": {
   "strategy": "PARTIAL_MATCH",
   "partialCredit": true,
   "maxScore": 14
  }
 },
 {
  "_id": "b4000000-0000-4000-8000-000000000011",
  "questionSetId": "b4000000-0000-4000-8000-000000000011",
  "revision": 1,
  "schemaVersion": 1,
  "partId": "16000000-0000-4000-8000-000000000014",
  "taskTypeCode": "HEADING_MATCHING",
  "title": "Music",
  "instructions": "Đọc bài văn và ghép tiêu đề phù hợp với từng đoạn.",
  "accessLevel": "PREMIUM",
  "stimulus": {
   "format": "PLAIN_TEXT",
   "value": "Topic: Music"
  },
  "sections": [],
  "items": [
   {
    "id": "item_1",
    "sequenceNo": 1,
    "prompt": {
     "format": "PLAIN_TEXT",
     "value": "Ghép mỗi đoạn văn với tiêu đề phù hợp."
    },
    "responseType": "MATCHING",
    "required": true,
    "maxScore": 14,
    "options": [],
    "leftItems": [
     {
      "id": "para1",
      "code": "Paragraph A",
      "content": "While music is often associated with emotional expression, playing certain instruments can be surprisingly physical. Percussionists, drummers, and even pianists require strong coordination, stamina, and posture. Marching band musicians must walk in sync for long hours, often while carrying heavy instruments. String players need muscular endurance in their fingers and arms, and wind instrument players must have good lung capacity. Practicing regularly and performing under pressure also places physical demands on the body. In this way, music isn’t only mentally engaging—it can also be quite the workout."
     },
     {
      "id": "para2",
      "code": "Paragraph B",
      "content": "Scientific studies have shown that learning to play music strengthens memory. When musicians play, they must recall notes, rhythms, and sequences, sometimes in real-time. Reading sheet music while coordinating hands or breath with timing challenges the brain, forming new neural pathways. This mental exercise has even been linked to improved academic performance in children and better memory retention in older adults. Whether memorizing entire pieces or remembering finger positions, the mental workout of music can benefit cognitive health across all age groups."
     },
     {
      "id": "para3",
      "code": "Paragraph C",
      "content": "Music often brings people together, whether in choirs, orchestras, or bands. Being part of a musical group requires teamwork and offers regular opportunities to meet new people. This shared experience fosters a strong sense of community and belonging. For many, joining a music class or ensemble is not just about performance, but also about making friends and socializing in a relaxed, collaborative setting. Over time, these connections can turn into lasting friendships, broadening one's personal and professional network."
     },
     {
      "id": "para4",
      "code": "Paragraph D",
      "content": "Learning music requires dedication and routine. Students must practice regularly, attend rehearsals, and develop time management skills to balance music with other responsibilities. This structure helps build self-discipline and patience. Mastering an instrument takes months, even years, and involves repeating scales, fixing mistakes, and gradually improving. These habits transfer to other areas of life, helping musicians stay focused and committed to long-term goals. Music teaches that progress comes through consistency and effort over time."
     },
     {
      "id": "para5",
      "code": "Paragraph E",
      "content": "For many people, music is a deeply emotional experience. It offers a unique and personal way to express feelings that may be difficult to put into words. Composing melodies, writing lyrics, or simply playing with passion allows individuals to explore their emotional world and communicate it with others. Music can reflect joy, sadness, hope, or frustration. For this reason, it is often used in therapy to help people process emotions. In creative expression, music becomes both an emotional release and a form of personal storytelling."
     },
     {
      "id": "para6",
      "code": "Paragraph F",
      "content": "Musicians often develop a heightened awareness of other people’s emotional states. In group settings, they must listen carefully and respond to changes in tone, tempo, or mood. This sensitivity helps them stay in harmony with others, both musically and socially. Playing music with others encourages empathy and understanding. Over time, this experience fosters emotional intelligence—a skill that benefits communication, relationships, and social awareness in everyday life."
     },
     {
      "id": "para7",
      "code": "Paragraph G",
      "content": "Many people report feeling happier and more balanced when music is part of their daily life. Playing or listening to music can reduce stress, improve mood, and create a sense of inner peace. It provides a break from daily routines and offers something meaningful to focus on. Some use music to relax before bed, while others rely on it to energize their mornings. The emotional and psychological benefits are powerful, making music a simple yet effective tool for personal well-being."
     }
    ],
    "rightItems": [
     {
      "id": "h1",
      "code": "1",
      "content": "Develop a greater sense of well-being"
     },
     {
      "id": "h2",
      "code": "2",
      "content": "A great opportunity to broaden your social circle"
     },
     {
      "id": "h3",
      "code": "3",
      "content": "A physically demanding activity"
     },
     {
      "id": "h4",
      "code": "4",
      "content": "Enhanced sensitivity to other people's feelings"
     },
     {
      "id": "h5",
      "code": "5",
      "content": "A good way to boost your memory"
     },
     {
      "id": "h6",
      "code": "6",
      "content": "Developing self-discipline through music"
     },
     {
      "id": "h7",
      "code": "7",
      "content": "A creative outlet for expressing emotions"
     }
    ],
    "constraints": {
     "pointsPerCorrect": 2
    },
    "rubricCode": null,
    "answerKey": {
     "type": "MATCHING",
     "selectedOptionId": null,
     "selectedOptionIds": [],
     "matches": {
      "para1": "h3",
      "para2": "h5",
      "para3": "h2",
      "para4": "h6",
      "para5": "h7",
      "para6": "h4",
      "para7": "h1"
     },
     "orderedOptionIds": [],
     "acceptedValues": [],
     "caseSensitive": false
    }
   }
  ],
  "assets": [],
  "settings": {
   "shuffleOptions": true,
   "shuffleItems": false,
   "maxAudioPlays": null,
   "showAnswerAfterEachItem": false,
   "allowReview": true
  },
  "scoring": {
   "strategy": "PARTIAL_MATCH",
   "partialCredit": true,
   "maxScore": 14
  }
 },
 {
  "_id": "b4000000-0000-4000-8000-000000000012",
  "questionSetId": "b4000000-0000-4000-8000-000000000012",
  "revision": 1,
  "schemaVersion": 1,
  "partId": "16000000-0000-4000-8000-000000000014",
  "taskTypeCode": "HEADING_MATCHING",
  "title": "Tulips",
  "instructions": "Đọc bài văn và ghép tiêu đề phù hợp với từng đoạn.",
  "accessLevel": "PREMIUM",
  "stimulus": {
   "format": "PLAIN_TEXT",
   "value": "Topic: Tulips"
  },
  "sections": [],
  "items": [
   {
    "id": "item_1",
    "sequenceNo": 1,
    "prompt": {
     "format": "PLAIN_TEXT",
     "value": "Ghép mỗi đoạn văn với tiêu đề phù hợp."
    },
    "responseType": "MATCHING",
    "required": true,
    "maxScore": 14,
    "options": [],
    "leftItems": [
     {
      "id": "para1",
      "code": "Paragraph A",
      "content": "In the 17th century, Amsterdam was a prosperous city in the Netherlands. Besides, the Netherlands experienced a period of immense wealth and cultural development. Trade, science, and the arts flourished, creating a thriving middle class with disposable income. This prosperity led to a growing interest in luxury items, including rare flowers such as tulips. The booming economy encouraged speculative investments, and tulips quickly became a symbol of wealth and social status. Their rising popularity was not merely about beauty but about prestige—owning exotic tulips was a way to showcase one's success in this golden era."
     },
     {
      "id": "para2",
      "code": "Paragraph B",
      "content": "Tulips first gained popularity in the Ottoman Empire and later spread to Western Europe. When they arrived in the Netherlands, they became an instant sensation. Their bold colors and unique shapes captivated people, and soon tulips were planted in aristocratic gardens and depicted in still-life paintings. The flower’s visual appeal made it highly desirable among the wealthy and artistic communities. By the early 1600s, tulips had become one of the most fashionable items in Dutch society, and their fame began to outshine other plants traditionally valued in Europe."
     },
     {
      "id": "para3",
      "code": "Paragraph C",
      "content": "As their popularity increased, tulips transitioned from decorative items to commodities. They began to be sold in markets, sometimes even before they had bloomed. Merchants treated tulip bulbs like valuable assets, often purchasing them based on future availability. Buyers and sellers exchanged contracts instead of the actual flowers, betting on future prices. This speculative behavior turned the tulip into more than just a flower—it became a financial instrument, with its value fluctuating daily based on market trends and demand."
     },
     {
      "id": "para4",
      "code": "Paragraph D",
      "content": "There are hundreds of tulip varieties, differing in color, shape, and pattern. Some of the most prized tulips during the 17th century were those with unique stripes or flame-like markings on their petals. These effects were later discovered to be caused by a virus affecting the flower, but at the time they were considered extremely rare and beautiful. Breeders carefully cultivated new hybrids, and collectors paid large sums for bulbs with unusual appearances. This diversity in types helped fuel the tulip craze, as people competed to own the most exotic specimens."
     },
     {
      "id": "para5",
      "code": "Paragraph E",
      "content": "The tulip trade operated on a complex system of contracts, options, and informal agreements. Because bulbs bloom only once a year, buyers often agreed on future purchases, sometimes without even seeing the flower. Specialized markets were established where traders could buy and sell tulip futures. Prices were agreed upon months in advance, and payments were made when the bulbs were delivered. This abstract trading model made it easier for speculators to participate, but it also disconnected the trade from the real value of the product itself."
     },
     {
      "id": "para6",
      "code": "Paragraph F",
      "content": "Tulip trading wasn’t limited to the Netherlands. As demand grew, bulbs were shipped across Europe—from France to England and beyond. Traders carried these rare goods by land and sea, navigating a web of routes and tariffs. Each region had its own preferences, and what was fashionable in Amsterdam might not be as popular in Paris. Nonetheless, tulips remained a desirable item among European elites, and international trade routes helped spread both the flower and its financial influence across the continent."
     },
     {
      "id": "para7",
      "code": "Paragraph G",
      "content": "The tulip market collapsed suddenly in 1637. After years of increasing prices and wild speculation, confidence disappeared overnight. Buyers stopped showing up to auctions, and contracts became worthless. Panic spread, and traders who had invested heavily were left with massive debts and unsellable bulbs. This event, often referred to as the first economic bubble in history, highlighted the dangers of speculative markets. The tulip crash left a deep impact on the Dutch economy and became a cautionary tale still taught in economics courses today."
     }
    ],
    "rightItems": [
     {
      "id": "h1",
      "code": "1",
      "content": "An Unexpected turn of events"
     },
     {
      "id": "h2",
      "code": "2",
      "content": "Coming into fashion"
     },
     {
      "id": "h3",
      "code": "3",
      "content": "Trade across Europe"
     },
     {
      "id": "h4",
      "code": "4",
      "content": "An object of trade"
     },
     {
      "id": "h5",
      "code": "5",
      "content": "The economy during the Golden Age"
     },
     {
      "id": "h6",
      "code": "6",
      "content": "Trade mechanics"
     },
     {
      "id": "h7",
      "code": "7",
      "content": "Different types of tulip"
     }
    ],
    "constraints": {
     "pointsPerCorrect": 2
    },
    "rubricCode": null,
    "answerKey": {
     "type": "MATCHING",
     "selectedOptionId": null,
     "selectedOptionIds": [],
     "matches": {
      "para1": "h5",
      "para2": "h2",
      "para3": "h4",
      "para4": "h7",
      "para5": "h6",
      "para6": "h3",
      "para7": "h1"
     },
     "orderedOptionIds": [],
     "acceptedValues": [],
     "caseSensitive": false
    }
   }
  ],
  "assets": [],
  "settings": {
   "shuffleOptions": true,
   "shuffleItems": false,
   "maxAudioPlays": null,
   "showAnswerAfterEachItem": false,
   "allowReview": true
  },
  "scoring": {
   "strategy": "PARTIAL_MATCH",
   "partialCredit": true,
   "maxScore": 14
  }
 },
 {
  "_id": "b4000000-0000-4000-8000-000000000013",
  "questionSetId": "b4000000-0000-4000-8000-000000000013",
  "revision": 1,
  "schemaVersion": 1,
  "partId": "16000000-0000-4000-8000-000000000014",
  "taskTypeCode": "HEADING_MATCHING",
  "title": "Early Australia",
  "instructions": "Đọc bài văn và ghép tiêu đề phù hợp với từng đoạn.",
  "accessLevel": "PREMIUM",
  "stimulus": {
   "format": "PLAIN_TEXT",
   "value": "Zoo"
  },
  "sections": [],
  "items": [
   {
    "id": "item_1",
    "sequenceNo": 1,
    "prompt": {
     "format": "PLAIN_TEXT",
     "value": "Ghép mỗi đoạn văn với tiêu đề phù hợp."
    },
    "responseType": "MATCHING",
    "required": true,
    "maxScore": 14,
    "options": [],
    "leftItems": [
     {
      "id": "para1",
      "code": "Paragraph A",
      "content": "Some researchers are rethinking the traditional narrative of how Australia was settled. While it is widely believed that the first people arrived via land bridges from Southeast Asia during the Ice Age, new theories suggest otherwise. Alternative histories propose that early humans may have used rudimentary boats to cross from distant shores far earlier than previously estimated. These claims are controversial but are supported by some archaeological findings and oral traditions of Indigenous communities. Such ideas challenge the Eurocentric view of exploration and emphasize the ingenuity of early seafarers long before written records existed."
     },
     {
      "id": "para2",
      "code": "Paragraph B",
      "content": "The vast Australian outback and its harsh deserts have long posed a formidable challenge to resettlement and development. For thousands of years, the central areas of the continent were difficult to inhabit due to extreme heat, scarce water sources, and isolation. Even after European arrival, these natural barriers prevented deeper exploration and settlement for decades. Today, the environment still remains an obstacle, limiting infrastructure, agriculture, and population growth in these regions. The Australian landscape, while beautiful and iconic, continues to shape the way communities are formed and connected."
     },
     {
      "id": "para3",
      "code": "Paragraph C",
      "content": "Advancements in marine technology have revolutionized our understanding of ancient migration routes to Australia. Underwater sonar mapping and satellite imaging have revealed submerged land masses and potential seafaring paths once used by early humans. Archaeologists are now uncovering tools and fossils deep beneath coastal waters, which provide new insights into how long ago people arrived on the continent. These discoveries would not be possible without modern equipment that allows exploration of areas previously inaccessible. As research continues, scientists hope to fill in many historical gaps that have puzzled historians for centuries."
     },
     {
      "id": "para4",
      "code": "Paragraph D",
      "content": "It is now widely believed that the journey to Australia wasn't completed in one go. Instead, early humans likely reached the continent in stages, moving through island chains and coastal areas over generations. This theory is supported by the distribution of artifacts and remains across Southeast Asia and Northern Australia. The idea of gradual migration, rather than a single wave, helps explain the diversity of early populations found on the continent. This step-by-step approach also reflects how ancient peoples adapted to different environments as they moved closer to the Australian mainland."
     },
     {
      "id": "para5",
      "code": "Paragraph E",
      "content": "In recent years, new evidence has emerged from both land and sea, prompting scientists to re-evaluate earlier assumptions. A set of ancient tools discovered in a Northern Territory cave doesn't match previously known Aboriginal designs, leading some to speculate about earlier migrations or even contact with other civilizations. Additionally, genetic studies hint at complex interactions with now-extinct human species. These findings, while not yet definitive, open the door to exciting discussions and possibilities about Australia's earliest human history."
     },
     {
      "id": "para6",
      "code": "Paragraph F",
      "content": "Many of the first explorers to attempt crossing Australia's interior were ill-prepared for the harsh conditions they encountered. Without sufficient knowledge of the land or survival skills in such a hostile environment, numerous expeditions ended in tragedy. The lack of understanding of the Aboriginal methods of finding water, navigating terrain, and managing heat led to avoidable suffering. It wasn't until later that European settlers began to adapt, learning from Indigenous Australians how to travel and survive in such an unfamiliar landscape."
     },
     {
      "id": "para7",
      "code": "Paragraph G",
      "content": "Despite the many difficulties, both ancient and modern explorers showed incredible perseverance in reaching and understanding Australia. Whether navigating unknown seas in simple rafts or trekking across searing deserts with limited supplies, their determination pushed the boundaries of what was thought possible. Stories of survival and discovery continue to inspire awe, reminding us of the strength and courage required to explore the unknown. Through the centuries, this spirit of exploration has become a core part of Australian history and identity."
     }
    ],
    "rightItems": [
     {
      "id": "h1",
      "code": "1",
      "content": "Technology helps uncover the ocean's secret"
     },
     {
      "id": "h2",
      "code": "2",
      "content": "An alternative history of settlement"
     },
     {
      "id": "h3",
      "code": "3",
      "content": "A new evidence that leads to speculation"
     },
     {
      "id": "h4",
      "code": "4",
      "content": "Lack of knowledge and skills"
     },
     {
      "id": "h5",
      "code": "5",
      "content": "Determination of the explorers through the ages"
     },
     {
      "id": "h6",
      "code": "6",
      "content": "Natural barrier to resettlement"
     },
     {
      "id": "h7",
      "code": "7",
      "content": "A Journey made by stages"
     }
    ],
    "constraints": {
     "pointsPerCorrect": 2
    },
    "rubricCode": null,
    "answerKey": {
     "type": "MATCHING",
     "selectedOptionId": null,
     "selectedOptionIds": [],
     "matches": {
      "para1": "h2",
      "para2": "h6",
      "para3": "h1",
      "para4": "h7",
      "para5": "h3",
      "para6": "h4",
      "para7": "h5"
     },
     "orderedOptionIds": [],
     "acceptedValues": [],
     "caseSensitive": false
    }
   }
  ],
  "assets": [],
  "settings": {
   "shuffleOptions": true,
   "shuffleItems": false,
   "maxAudioPlays": null,
   "showAnswerAfterEachItem": false,
   "allowReview": true
  },
  "scoring": {
   "strategy": "PARTIAL_MATCH",
   "partialCredit": true,
   "maxScore": 14
  }
 },
 {
  "_id": "b4000000-0000-4000-8000-000000000014",
  "questionSetId": "b4000000-0000-4000-8000-000000000014",
  "revision": 1,
  "schemaVersion": 1,
  "partId": "16000000-0000-4000-8000-000000000014",
  "taskTypeCode": "HEADING_MATCHING",
  "title": "Charles Dicken",
  "instructions": "Đọc bài văn và ghép tiêu đề phù hợp với từng đoạn.",
  "accessLevel": "PREMIUM",
  "stimulus": {
   "format": "PLAIN_TEXT",
   "value": "Topic: Charles Dicken"
  },
  "sections": [],
  "items": [
   {
    "id": "item_1",
    "sequenceNo": 1,
    "prompt": {
     "format": "PLAIN_TEXT",
     "value": "Ghép mỗi đoạn văn với tiêu đề phù hợp."
    },
    "responseType": "MATCHING",
    "required": true,
    "maxScore": 14,
    "options": [],
    "leftItems": [
     {
      "id": "para1",
      "code": "Paragraph A",
      "content": "The popularity of Dickens's works in our time remains a global phenomenon. Although he wrote his novels in the 19th century, his works have had a global impact. In addition, these masterpieces helped connect Renaissance drama to the multimedia revolution. Many readers find the characters and themes surprisingly modern."
     },
     {
      "id": "para2",
      "code": "Paragraph B",
      "content": "Shakespeare's plays are difficult to understand and sometimes require the reader to struggle or think twice to figure out the character's thoughts. Sometimes the dialogue tends to be emotional without any connection to the context of the story. There are many passages that are a confusing mess of single words and old classical vocabulary."
     },
     {
      "id": "para3",
      "code": "Paragraph C",
      "content": "Hamlet is a Renaissance tragedy written by Shakespeare. The play is very long and has plot twists that keep the reader guessing. Dickens had a special interest in the work. He told his daughter to keep an eye on Hamlet. For Dickens' novels, he sometimes created serial editions, with new chapters released monthly, keeping readers eagerly awaiting the next issue."
     },
     {
      "id": "para4",
      "code": "Paragraph D",
      "content": "Dickens' legacy is undeniable. His works have been translated and used in over 100 countries and are studied by most schoolchildren in the world. It has even been said that Dickens' legacy belongs not to one era but to all times. It is easy to see that Dickens lives on in society and culture through his language and through his enduring influence on education and the media."
     },
     {
      "id": "para5",
      "code": "Paragraph E",
      "content": "Dickens achieved success at a young age. His first novel, The Pickwick Papers, was published when he was only 24 and became a bestseller. His success increased throughout the 1590s. He was honored as a member of the Lord Chamber Men - those lucky enough to perform for the Queen of England on many occasions. Alongside his novels and plays, he also published many poems in his own style."
     },
     {
      "id": "para6",
      "code": "Paragraph F",
      "content": "As Dickens's reputation grew, the question arose whether to preserve his legacy and make it live on. Dickens himself was always keen to make his mark and to maintain his uniqueness. He even attempted to break the dominance of the popular comedies of the time with a series of dramatic plays."
     },
     {
      "id": "para7",
      "code": "Paragraph G",
      "content": "To mark the 400th anniversary of Dickens’ death, there will be a number of events to help readers, and especially students, better understand his works. There will be videos detailing the content of each of his works to help people excitedly explore the pinnacle of language and the meaning his works bring to our daily lives."
     }
    ],
    "rightItems": [
     {
      "id": "h1",
      "code": "1",
      "content": "Dicken’s early success"
     },
     {
      "id": "h2",
      "code": "2",
      "content": "Bring the books to life"
     },
     {
      "id": "h3",
      "code": "3",
      "content": "Trying to protect his property"
     },
     {
      "id": "h4",
      "code": "4",
      "content": "The influence of the media"
     },
     {
      "id": "h5",
      "code": "5",
      "content": "Keep the reader guessing"
     },
     {
      "id": "h6",
      "code": "6",
      "content": "Difficulties for modern readers"
     },
     {
      "id": "h7",
      "code": "7",
      "content": "Dicken for our time"
     }
    ],
    "constraints": {
     "pointsPerCorrect": 2
    },
    "rubricCode": null,
    "answerKey": {
     "type": "MATCHING",
     "selectedOptionId": null,
     "selectedOptionIds": [],
     "matches": {
      "para1": "h7",
      "para2": "h6",
      "para3": "h5",
      "para4": "h4",
      "para5": "h1",
      "para6": "h3",
      "para7": "h2"
     },
     "orderedOptionIds": [],
     "acceptedValues": [],
     "caseSensitive": false
    }
   }
  ],
  "assets": [],
  "settings": {
   "shuffleOptions": true,
   "shuffleItems": false,
   "maxAudioPlays": null,
   "showAnswerAfterEachItem": false,
   "allowReview": true
  },
  "scoring": {
   "strategy": "PARTIAL_MATCH",
   "partialCredit": true,
   "maxScore": 14
  }
 },
 {
  "_id": "b4000000-0000-4000-8000-000000000015",
  "questionSetId": "b4000000-0000-4000-8000-000000000015",
  "revision": 1,
  "schemaVersion": 1,
  "partId": "16000000-0000-4000-8000-000000000014",
  "taskTypeCode": "HEADING_MATCHING",
  "title": "Children and Exercises",
  "instructions": "Đọc bài văn và ghép tiêu đề phù hợp với từng đoạn.",
  "accessLevel": "PREMIUM",
  "stimulus": {
   "format": "PLAIN_TEXT",
   "value": "Topic: Children and Exercises"
  },
  "sections": [],
  "items": [
   {
    "id": "item_1",
    "sequenceNo": 1,
    "prompt": {
     "format": "PLAIN_TEXT",
     "value": "Ghép mỗi đoạn văn với tiêu đề phù hợp."
    },
    "responseType": "MATCHING",
    "required": true,
    "maxScore": 14,
    "options": [],
    "leftItems": [
     {
      "id": "para1",
      "code": "Paragraph A",
      "content": "In recent years, children have been engaging in less physical activity. Instead, research has shown that the amount of time spent outdoors has decreased while the amount of time spent lounging on the sofa at home has increased significantly. While technology is often cited as the main cause, it is not the only reason. Urbanisation has limited the amount of space available for children to play. In today's world, children spend many hours doing homework. This forces them to spend more time indoors. The combination of screen time and lack of exercise is having a negative impact on children's physical fitness and overall health."
     },
     {
      "id": "para2",
      "code": "Paragraph B",
      "content": "The phenomenon of children being sedentary is becoming more serious, largely due to the increase in time spent on electronic devices. The lure of smartphones and computers makes it difficult for both parents and children to reduce their screen time. As people become more aware of the benefits of exercise, it is imperative that we work together to find effective solutions to promote an active lifestyle."
     },
     {
      "id": "para3",
      "code": "Paragraph C",
      "content": "An inspiring example is a teacher who started a program called Daily Mile, in which students are encouraged to run at least one mile every day. This simple idea quickly gained widespread support. Thanks to media coverage and positive feedback, the program has won numerous awards and is implemented in more than 3,500 schools in 36 countries. This initiative shows that small changes can have a big impact on children's exercise habits."
     },
     {
      "id": "para4",
      "code": "Paragraph D",
      "content": "Daily Mile not only improves students' physical fitness, but also helps improve academic performance. Many teachers have noted that students who participate in this program become more focused and alert in class. Psychologists also agree that physical fitness contributes to mental clarity. The saying 'a healthy body is the foundation for a healthy mind' shows that regular exercise has a positive effect on children's ability to learn and remember."
     },
     {
      "id": "para5",
      "code": "Paragraph E",
      "content": "The living and learning environment has a great influence on human behavior. For example, workplaces are often arranged to improve efficiency, while living spaces are designed to promote connections between members. Similarly, schools can be designed to encourage children to be active. Arranging open areas suitable for play and physical exercise can help students maintain an active lifestyle and fight the trend of being sedentary."
     },
     {
      "id": "para6",
      "code": "Paragraph F",
      "content": "In Japan, an innovative architect designed a kindergarten in a very different way: the playground was built like a running track, allowing children to run and move freely. He said: “It is simple”, “Just start running” This innovative approach was not only successful but also won an award for its positive impact on children’s activity levels. Such thoughtful designs could inspire other schools to rethink how they create spaces that support learning while promoting physical activity."
     },
     {
      "id": "para7",
      "code": "Paragraph G",
      "content": "Daily Mile and the Japanese architect’s playground design represent two different approaches to finance. The Daily Mile is virtually free, while the playground model requires a large investment. Local authorities need to consider many factors to balance promoting physical activity for children and managing their budgets appropriately. By finding creative but cost-effective solutions, communities can create environments that support children’s health and overall development."
     }
    ],
    "rightItems": [
     {
      "id": "h1",
      "code": "1",
      "content": "Ways in which environment can influence behaviour"
     },
     {
      "id": "h2",
      "code": "2",
      "content": "Factors contributing to inactivity"
     },
     {
      "id": "h3",
      "code": "3",
      "content": "The wider effects of regular activity"
     },
     {
      "id": "h4",
      "code": "4",
      "content": "A design for exercise and for study"
     },
     {
      "id": "h5",
      "code": "5",
      "content": "The situation has the potential of being worst"
     },
     {
      "id": "h6",
      "code": "6",
      "content": "The success of a simple idea"
     },
     {
      "id": "h7",
      "code": "7",
      "content": "Achieving the right balance"
     }
    ],
    "constraints": {
     "pointsPerCorrect": 2
    },
    "rubricCode": null,
    "answerKey": {
     "type": "MATCHING",
     "selectedOptionId": null,
     "selectedOptionIds": [],
     "matches": {
      "para1": "h2",
      "para2": "h5",
      "para3": "h6",
      "para4": "h3",
      "para5": "h1",
      "para6": "h4",
      "para7": "h7"
     },
     "orderedOptionIds": [],
     "acceptedValues": [],
     "caseSensitive": false
    }
   }
  ],
  "assets": [],
  "settings": {
   "shuffleOptions": true,
   "shuffleItems": false,
   "maxAudioPlays": null,
   "showAnswerAfterEachItem": false,
   "allowReview": true
  },
  "scoring": {
   "strategy": "PARTIAL_MATCH",
   "partialCredit": true,
   "maxScore": 14
  }
 },
 {
  "_id": "b4000000-0000-4000-8000-000000000016",
  "questionSetId": "b4000000-0000-4000-8000-000000000016",
  "revision": 1,
  "schemaVersion": 1,
  "partId": "16000000-0000-4000-8000-000000000014",
  "taskTypeCode": "HEADING_MATCHING",
  "title": "Coffee",
  "instructions": "Đọc bài văn và ghép tiêu đề phù hợp với từng đoạn.",
  "accessLevel": "PREMIUM",
  "stimulus": {
   "format": "PLAIN_TEXT",
   "value": "Topic: Coffee"
  },
  "sections": [],
  "items": [
   {
    "id": "item_1",
    "sequenceNo": 1,
    "prompt": {
     "format": "PLAIN_TEXT",
     "value": "Ghép mỗi đoạn văn với tiêu đề phù hợp."
    },
    "responseType": "MATCHING",
    "required": true,
    "maxScore": 14,
    "options": [],
    "leftItems": [
     {
      "id": "para1",
      "code": "Paragraph A",
      "content": "The custom of drinking coffee has been around for a long time, perhaps as long as 1500 years ago. There were times when drinking coffee was banned in many places. At that time, coffee houses were opened in some places in Egypt and Ethiopia. Later, the custom of drinking coffee spread to Italy and all over Europe. Not long after that, the Dutch introduced coffee to Asia. Later, the habit of drinking coffee became popular all over the world."
     },
     {
      "id": "para2",
      "code": "Paragraph B",
      "content": "Coffee was first used in Africa but Europe is known as the largest coffee consuming region in the world. In the 18th century, many people from different professions such as writers, philosophers and politicians used coffee to stay awake during discussions and meetings. Coffee houses became meeting places for people to share ideas and debate hot topics in society. These places made it easy for people to share their intellectual thoughts and played an important role in business and society at that time."
     },
     {
      "id": "para3",
      "code": "Paragraph C",
      "content": "Nowadays, many people have the habit of drinking coffee in the morning to wake up, or going to coffee shops in the evening to meet and socialize with each other. Coffee shops are popping up everywhere, providing places for people to relax and talk to each other. Coffee has become a global business, with personal coffee makers even appearing in households. Famous global coffee brands have become giant companies, using their brands and communication strategies to attract millions of coffee lovers around the world."
     },
     {
      "id": "para4",
      "code": "Paragraph D",
      "content": "Coffee consumption in Europe accounts for about 90% of global coffee production, making it the largest market in the world. Meanwhile, some other countries in Africa such as Egypt and Ethiopia rely heavily on coffee exports to sustain their economies. However, there is a problem of injustice: workers in these African countries face terrible living and working conditions, with incomes as low as $1 a day. While wealthy European countries make huge profits from coffee, people in coffee-growing countries do not receive a fair share of their efforts and hard work."
     },
     {
      "id": "para5",
      "code": "Paragraph E",
      "content": "To address this injustice, certification schemes for agricultural production have been introduced. If coffee meets certain certification standards, it can be sold at fair prices, preventing growers from having to sell at rock-bottom prices. However, there are problems with this solution. In reality, only about 5% of coffee meets the standards. Many small coffee producers in developing countries are too poor to pay the certification fees, leaving them even further behind in the global coffee market."
     },
     {
      "id": "para6",
      "code": "Paragraph F",
      "content": "There is much debate about the effects of coffee on human health. It is true that coffee can help many people stay awake and concentrate. It contains antioxidants, which can help prevent diseases. But while drinking coffee, people often add sugar and milk and these can be harmful to your health. This can easily cause diseases such as diabetes or obesity for those who use it."
     },
     {
      "id": "para7",
      "code": "Paragraph G",
      "content": "There is a legend about coffee. In the past, a monk observed that birds became more active and lively when they ate a small fruit. The monk then drank the juice from the fruit and stayed awake praying and talking until late at night. So it can be said that thanks to these birds, people knew about the coffee plant."
     }
    ],
    "rightItems": [
     {
      "id": "h1",
      "code": "1",
      "content": "Health risks versus health benefits debate"
     },
     {
      "id": "h2",
      "code": "2",
      "content": "A remedy of unjust revenue distribution"
     },
     {
      "id": "h3",
      "code": "3",
      "content": "The custom of coffee drinking begins to spread"
     },
     {
      "id": "h4",
      "code": "4",
      "content": "Problems of coffee economy"
     },
     {
      "id": "h5",
      "code": "5",
      "content": "The ancient origin of coffee"
     },
     {
      "id": "h6",
      "code": "6",
      "content": "Coffee encourages the art of conversation"
     },
     {
      "id": "h7",
      "code": "7",
      "content": "A habit that has become a big economy"
     }
    ],
    "constraints": {
     "pointsPerCorrect": 2
    },
    "rubricCode": null,
    "answerKey": {
     "type": "MATCHING",
     "selectedOptionId": null,
     "selectedOptionIds": [],
     "matches": {
      "para1": "h3",
      "para2": "h6",
      "para3": "h7",
      "para4": "h4",
      "para5": "h2",
      "para6": "h1",
      "para7": "h5"
     },
     "orderedOptionIds": [],
     "acceptedValues": [],
     "caseSensitive": false
    }
   }
  ],
  "assets": [],
  "settings": {
   "shuffleOptions": true,
   "shuffleItems": false,
   "maxAudioPlays": null,
   "showAnswerAfterEachItem": false,
   "allowReview": true
  },
  "scoring": {
   "strategy": "PARTIAL_MATCH",
   "partialCredit": true,
   "maxScore": 14
  }
 },
 {
  "_id": "b4000000-0000-4000-8000-000000000017",
  "questionSetId": "b4000000-0000-4000-8000-000000000017",
  "revision": 1,
  "schemaVersion": 1,
  "partId": "16000000-0000-4000-8000-000000000014",
  "taskTypeCode": "HEADING_MATCHING",
  "title": "Consumer age",
  "instructions": "Đọc bài văn và ghép tiêu đề phù hợp với từng đoạn.",
  "accessLevel": "PREMIUM",
  "stimulus": {
   "format": "PLAIN_TEXT",
   "value": "Topic: Consumer age"
  },
  "sections": [],
  "items": [
   {
    "id": "item_1",
    "sequenceNo": 1,
    "prompt": {
     "format": "PLAIN_TEXT",
     "value": "Ghép mỗi đoạn văn với tiêu đề phù hợp."
    },
    "responseType": "MATCHING",
    "required": true,
    "maxScore": 14,
    "options": [],
    "leftItems": [
     {
      "id": "para1",
      "code": "Paragraph A",
      "content": "In today's modern consumer age, people tend to own more than they used to. A worker only has 5-6 pairs of shoes in his entire life. And he will repair them when they break or wear out, not throw them away. Nowadays, if we have a phone, it is expected that you will use such electronic devices throughout your life."
     },
     {
      "id": "para2",
      "code": "Paragraph B",
      "content": "Mrs. Judith Levine - a journalist and her husband decided to change their lifestyle to be as minimalist as possible. They only buy what is absolutely necessary, such as food for work. They do not go to the cinema, cafes, restaurants. As a writer, I can say that she is saving for a purpose of publishing her findings as a book."
     },
     {
      "id": "para3",
      "code": "Paragraph C",
      "content": "To make this experiment as realistic as possible, Ms. Levine and her husband decided not to tell anyone, because they knew that once their friends knew about this plan, they would mention the issue of paying for the couple's share when they went out together. Therefore, the couple was determined to keep it a secret from friends, family and strangers."
     },
     {
      "id": "para4",
      "code": "Paragraph D",
      "content": "Published in 2006, the book Not Buying It when reread 10 years later still holds its value. They believe that journalist Ms. Levine has the ability to predict future consumer trends. The minimalist lifestyle she mentioned has become a trend today."
     },
     {
      "id": "para5",
      "code": "Paragraph E",
      "content": "The couple wanted to buy a gift as a gift. However, that went against their point of not buying unnecessary things. And they decided to make it themselves to have a lower spending level. However, none of them have any aesthetic talent, so they finally decided to give a meaningful and practical gift to the recipient, which is a piece of their jewelry."
     },
     {
      "id": "para6",
      "code": "Paragraph F",
      "content": "Ms. Levine does not have an office, which is quite inconvenient when she has to meet partners in a coffee shop. When working alone, she often goes to the public library and finds it very convenient."
     },
     {
      "id": "para7",
      "code": "Paragraph G",
      "content": "Lessons about minimalism in today's consumer trends: buy things that are really necessary, switch from driving cars and motorbikes to cycling and walking."
     }
    ],
    "rightItems": [
     {
      "id": "h1",
      "code": "1",
      "content": "Important lessons for all of us"
     },
     {
      "id": "h2",
      "code": "2",
      "content": "Making things last longer"
     },
     {
      "id": "h3",
      "code": "3",
      "content": "The difficulty of being generous"
     },
     {
      "id": "h4",
      "code": "4",
      "content": "Reason to reach a compromise"
     },
     {
      "id": "h5",
      "code": "5",
      "content": "A temporary experiment"
     },
     {
      "id": "h6",
      "code": "6",
      "content": "Still relevant to our times"
     },
     {
      "id": "h7",
      "code": "7",
      "content": "The reason of secrecy"
     }
    ],
    "constraints": {
     "pointsPerCorrect": 2
    },
    "rubricCode": null,
    "answerKey": {
     "type": "MATCHING",
     "selectedOptionId": null,
     "selectedOptionIds": [],
     "matches": {
      "para1": "h2",
      "para2": "h5",
      "para3": "h7",
      "para4": "h6",
      "para5": "h3",
      "para6": "h4",
      "para7": "h1"
     },
     "orderedOptionIds": [],
     "acceptedValues": [],
     "caseSensitive": false
    }
   }
  ],
  "assets": [],
  "settings": {
   "shuffleOptions": true,
   "shuffleItems": false,
   "maxAudioPlays": null,
   "showAnswerAfterEachItem": false,
   "allowReview": true
  },
  "scoring": {
   "strategy": "PARTIAL_MATCH",
   "partialCredit": true,
   "maxScore": 14
  }
 },
 {
  "_id": "b4000000-0000-4000-8000-000000000018",
  "questionSetId": "b4000000-0000-4000-8000-000000000018",
  "revision": 1,
  "schemaVersion": 1,
  "partId": "16000000-0000-4000-8000-000000000014",
  "taskTypeCode": "HEADING_MATCHING",
  "title": "Doggett’s coat and badge",
  "instructions": "Đọc bài văn và ghép tiêu đề phù hợp với từng đoạn.",
  "accessLevel": "PREMIUM",
  "stimulus": {
   "format": "PLAIN_TEXT",
   "value": "Topic: Doggett’s coat and badge"
  },
  "sections": [],
  "items": [
   {
    "id": "item_1",
    "sequenceNo": 1,
    "prompt": {
     "format": "PLAIN_TEXT",
     "value": "Ghép mỗi đoạn văn với tiêu đề phù hợp."
    },
    "responseType": "MATCHING",
    "required": true,
    "maxScore": 14,
    "options": [],
    "leftItems": [
     {
      "id": "para1",
      "code": "Paragraph A",
      "content": "In the early 18th century, London’s roads were often muddy, overcrowded, and difficult to travel on. As a result, the River Thames served as the main “highway” through the city. People frequently used water taxis-small boats rowed by trained professionals called watermen-to move around quickly. These water journeys were not only faster but often safer than traveling by road. For many Londoners, taking a boat was the most efficient way to attend work, markets, or social events. The Doggett’s race, therefore, celebrates not just rowing skill, but the essential role that watermen played in daily life during that time."
     },
     {
      "id": "para2",
      "code": "Paragraph B",
      "content": "The Doggett’s Coat and Badge race was established in 1715 by Thomas Doggett, an Irish actor and theatre manager, who became well known in London. According to popular accounts, Doggett once narrowly escaped drowning while traveling on the River Thames. To express his gratitude for the boatman who saved him and to honor the newly crowned King George I, he created this race. It was open to young watermen who had recently completed their apprenticeships, giving them a chance to demonstrate their rowing skills. Over time, this event became not just a tribute to a personal event, but a long-standing tradition that celebrates both history and the craft of rowing on the Thames."
     },
     {
      "id": "para3",
      "code": "Paragraph C",
      "content": "The prize awarded to the winner of the Doggett’s Coat and Badge race is unlike any ordinary trophy. Instead of money or medals, the champion receives a traditional red coat and a silver badge. These items are deeply symbolic and represent the pride and respect historically associated with watermen. Each piece is custom-made for the winner and presented in a formal ceremony that highlights the cultural importance of the event. The coat reflects 18th-century styles, while the badge often includes royal imagery and references to the Thames. This unique reward continues to connect the modern race with its historical roots and honors the profession’s heritage."
     },
     {
      "id": "para4",
      "code": "Paragraph D",
      "content": "Although the Doggett’s race remains one of the oldest sporting events in the world, some have raised concerns about its future. With modern boats, technology, and shifting interests among younger generations, participation has declined in recent decades. Suggestions have been made to modernize the race to keep it relevant-perhaps by changing the route, updating the boats, or increasing promotion on social media. Others argue that preserving tradition is more important than making it popular. This ongoing discussion reflects broader challenges faced by many traditional events in the modern world: how to honor the past while adapting to the present."
     },
     {
      "id": "para5",
      "code": "Paragraph E",
      "content": "Winning the Doggett’s Coat and Badge race is not just about rowing fast-it’s about gaining respect within a close-knit community. For many, this competition represents an important rite of passage. It is often the first time a newly qualified waterman competes on such a historic stage. Success in the race can lead to recognition, offers from exclusive rowing clubs, and opportunities to participate in ceremonial roles along the Thames. Even those who do not win often benefit from simply being involved. The reputation built through this race can carry weight throughout a rower’s career, especially in London’s traditional maritime circles."
     },
     {
      "id": "para6",
      "code": "Paragraph F",
      "content": "One of the most heartwarming aspects of the Doggett’s race is its multi-generational appeal. In several families, competing in the race is a proud tradition passed from one generation to the next. It’s not uncommon to hear stories of grandfathers, fathers, and sons all having taken part over the years. Some families even have multiple winners across decades. These personal connections add emotional depth to the event and preserve its history in living memory. For these families, the race is more than a competition-it’s a legacy. The bond between relatives strengthens as they share stories, train together, and wear the symbolic red coat with pride."
     },
     {
      "id": "para7",
      "code": "Paragraph G",
      "content": "Unlike many modern sports competitions, the Doggett’s Coat and Badge race offers no financial reward. The red coat and silver badge have cultural and emotional value, but not monetary. Contestants take part out of pride, tradition, and a deep respect for the waterman’s profession. Many dedicate months to training, not for riches but for the honor of winning one of Britain’s most historic races. The lack of financial incentive may even enhance the race’s prestige, showing that commitment to heritage and community can outweigh commercial interests. In today’s world, that kind of motivation stands out as truly admirable."
     }
    ],
    "rightItems": [
     {
      "id": "h1",
      "code": "1",
      "content": "A need for change"
     },
     {
      "id": "h2",
      "code": "2",
      "content": "Not in it for the money"
     },
     {
      "id": "h3",
      "code": "3",
      "content": "Earning a reputation"
     },
     {
      "id": "h4",
      "code": "4",
      "content": "The easiest way to travel"
     },
     {
      "id": "h5",
      "code": "5",
      "content": "Result of a lucky escape"
     },
     {
      "id": "h6",
      "code": "6",
      "content": "Origins of what the winner receives"
     },
     {
      "id": "h7",
      "code": "7",
      "content": "Generations of champions"
     }
    ],
    "constraints": {
     "pointsPerCorrect": 2
    },
    "rubricCode": null,
    "answerKey": {
     "type": "MATCHING",
     "selectedOptionId": null,
     "selectedOptionIds": [],
     "matches": {
      "para1": "h4",
      "para2": "h5",
      "para3": "h6",
      "para4": "h1",
      "para5": "h3",
      "para6": "h7",
      "para7": "h2"
     },
     "orderedOptionIds": [],
     "acceptedValues": [],
     "caseSensitive": false
    }
   }
  ],
  "assets": [],
  "settings": {
   "shuffleOptions": true,
   "shuffleItems": false,
   "maxAudioPlays": null,
   "showAnswerAfterEachItem": false,
   "allowReview": true
  },
  "scoring": {
   "strategy": "PARTIAL_MATCH",
   "partialCredit": true,
   "maxScore": 14
  }
 },
 {
  "_id": "b4000000-0000-4000-8000-000000000019",
  "questionSetId": "b4000000-0000-4000-8000-000000000019",
  "revision": 1,
  "schemaVersion": 1,
  "partId": "16000000-0000-4000-8000-000000000014",
  "taskTypeCode": "HEADING_MATCHING",
  "title": "Early Australia",
  "instructions": "Đọc bài văn và ghép tiêu đề phù hợp với từng đoạn.",
  "accessLevel": "PREMIUM",
  "stimulus": {
   "format": "PLAIN_TEXT",
   "value": "Topic: Early Australia"
  },
  "sections": [],
  "items": [
   {
    "id": "item_1",
    "sequenceNo": 1,
    "prompt": {
     "format": "PLAIN_TEXT",
     "value": "Ghép mỗi đoạn văn với tiêu đề phù hợp."
    },
    "responseType": "MATCHING",
    "required": true,
    "maxScore": 14,
    "options": [],
    "leftItems": [
     {
      "id": "para1",
      "code": "Paragraph A",
      "content": "Some researchers are rethinking the traditional narrative of how Australia was settled. While it is widely believed that the first people arrived via land bridges from Southeast Asia during the Ice Age, new theories suggest otherwise. Alternative histories propose that early humans may have used rudimentary boats to cross from distant shores far earlier than previously estimated. These claims are controversial but are supported by some archaeological findings and oral traditions of Indigenous communities. Such ideas challenge the Eurocentric view of exploration and emphasize the ingenuity of early seafarers long before written records existed."
     },
     {
      "id": "para2",
      "code": "Paragraph B",
      "content": "The vast Australian outback and its harsh deserts have long posed a formidable challenge to resettlement and development. For thousands of years, the central areas of the continent were difficult to inhabit due to extreme heat, scarce water sources, and isolation. Even after European arrival, these natural barriers prevented deeper exploration and settlement for decades. Today, the environment still remains an obstacle, limiting infrastructure, agriculture, and population growth in these regions. The Australian landscape, while beautiful and iconic, continues to shape the way communities are formed and connected."
     },
     {
      "id": "para3",
      "code": "Paragraph C",
      "content": "Advancements in marine technology have revolutionized our understanding of ancient migration routes to Australia. Underwater sonar mapping and satellite imaging have revealed submerged land masses and potential seafaring paths once used by early humans. Archaeologists are now uncovering tools and fossils deep beneath coastal waters, which provide new insights into how long ago people arrived on the continent. These discoveries would not be possible without modern equipment that allows exploration of areas previously inaccessible. As research continues, scientists hope to fill in many historical gaps that have puzzled historians for centuries."
     },
     {
      "id": "para4",
      "code": "Paragraph D",
      "content": "It is now widely believed that the journey to Australia wasn't completed in one go. Instead, early humans likely reached the continent in stages, moving through island chains and coastal areas over generations. This theory is supported by the distribution of artifacts and remains across Southeast Asia and Northern Australia. The idea of gradual migration, rather than a single wave, helps explain the diversity of early populations found on the continent. This step-by-step approach also reflects how ancient peoples adapted to different environments as they moved closer to the Australian mainland."
     },
     {
      "id": "para5",
      "code": "Paragraph E",
      "content": "In recent years, new evidence has emerged from both land and sea, prompting scientists to re-evaluate earlier assumptions. A set of ancient tools discovered in a Northern Territory cave doesn't match previously known Aboriginal designs, leading some to speculate about earlier migrations or even contact with other civilizations. Additionally, genetic studies hint at complex interactions with now-extinct human species. These findings, while not yet definitive, open the door to exciting discussions and possibilities about Australia's earliest human history."
     },
     {
      "id": "para6",
      "code": "Paragraph F",
      "content": "Many of the first explorers to attempt crossing Australia's interior were ill-prepared for the harsh conditions they encountered. Without sufficient knowledge of the land or survival skills in such a hostile environment, numerous expeditions ended in tragedy. The lack of understanding of the Aboriginal methods of finding water, navigating terrain, and managing heat led to avoidable suffering. It wasn't until later that European settlers began to adapt, learning from Indigenous Australians how to travel and survive in such an unfamiliar landscape."
     },
     {
      "id": "para7",
      "code": "Paragraph G",
      "content": "Despite the many difficulties, both ancient and modern explorers showed incredible perseverance in reaching and understanding Australia. Whether navigating unknown seas in simple rafts or trekking across searing deserts with limited supplies, their determination pushed the boundaries of what was thought possible. Stories of survival and discovery continue to inspire awe, reminding us of the strength and courage required to explore the unknown. Through the centuries, this spirit of exploration has become a core part of Australian history and identity."
     }
    ],
    "rightItems": [
     {
      "id": "h1",
      "code": "1",
      "content": "An alternative history of settlement"
     },
     {
      "id": "h2",
      "code": "2",
      "content": "A Journey made by stages"
     },
     {
      "id": "h3",
      "code": "3",
      "content": "A new evidence that leads to speculation"
     },
     {
      "id": "h4",
      "code": "4",
      "content": "Lack of knowledge and skills"
     },
     {
      "id": "h5",
      "code": "5",
      "content": "Determination of the explorers through the ages"
     },
     {
      "id": "h6",
      "code": "6",
      "content": "Technology helps uncover the ocean’s secret"
     },
     {
      "id": "h7",
      "code": "7",
      "content": "Natural barrier to resettlement"
     }
    ],
    "constraints": {
     "pointsPerCorrect": 2
    },
    "rubricCode": null,
    "answerKey": {
     "type": "MATCHING",
     "selectedOptionId": null,
     "selectedOptionIds": [],
     "matches": {
      "para1": "h1",
      "para2": "h7",
      "para3": "h6",
      "para4": "h2",
      "para5": "h3",
      "para6": "h4",
      "para7": "h5"
     },
     "orderedOptionIds": [],
     "acceptedValues": [],
     "caseSensitive": false
    }
   }
  ],
  "assets": [],
  "settings": {
   "shuffleOptions": true,
   "shuffleItems": false,
   "maxAudioPlays": null,
   "showAnswerAfterEachItem": false,
   "allowReview": true
  },
  "scoring": {
   "strategy": "PARTIAL_MATCH",
   "partialCredit": true,
   "maxScore": 14
  }
 },
 {
  "_id": "b4000000-0000-4000-8000-000000000020",
  "questionSetId": "b4000000-0000-4000-8000-000000000020",
  "revision": 1,
  "schemaVersion": 1,
  "partId": "16000000-0000-4000-8000-000000000014",
  "taskTypeCode": "HEADING_MATCHING",
  "title": "Eating in China",
  "instructions": "Đọc bài văn và ghép tiêu đề phù hợp với từng đoạn.",
  "accessLevel": "PREMIUM",
  "stimulus": {
   "format": "PLAIN_TEXT",
   "value": "Topic: Eating in China"
  },
  "sections": [],
  "items": [
   {
    "id": "item_1",
    "sequenceNo": 1,
    "prompt": {
     "format": "PLAIN_TEXT",
     "value": "Ghép mỗi đoạn văn với tiêu đề phù hợp."
    },
    "responseType": "MATCHING",
    "required": true,
    "maxScore": 14,
    "options": [],
    "leftItems": [
     {
      "id": "para1",
      "code": "Paragraph A",
      "content": "Chinese culinary culture is like most other cultures in the world. It started with very basic hunting and gathering. Over time, society gradually developed, and with it, culinary culture developed. Gradually, cuisine became an art form and seemed to reach its peak in the 19th century. Although most Chinese people choose simple food with rice and vegetables, it is undeniable that Chinese culinary art has reached the level of exploiting the maximum flavor and each ingredient."
     },
     {
      "id": "para2",
      "code": "Paragraph B",
      "content": "The concept of yin and yang has a complex influence on Chinese cuisine. In fact, this concept also appears in many other areas of life. It can be understood that yin and yang are opposite elements that complement each other to achieve a certain balance. Sweet and sour, cold and hot are typical examples of this concept. Some foods can be classified into hot or cold groups, such as lemon is considered cold and onion is considered hot. Based on this concept, Chinese people choose suitable foods to maintain the balance of the body."
     },
     {
      "id": "para3",
      "code": "Paragraph C",
      "content": "In addition to the concept of yin and yang directly influencing the culinary culture, the Chinese also pay close attention to the availability of ingredients. Each region has its own ingredients, and this leads to differences in regional cooking styles. The coastal areas in the south of the country are famous for seafood dishes. In the north, the widespread cultivation of wheat has led to noodle dishes. The southwestern regions are famous for spicy soups, while some regions are famous for grilled meat."
     },
     {
      "id": "para4",
      "code": "Paragraph D",
      "content": "Cooking methods are also regionally specific, in addition to the differences in food in these regions. However, there are some food techniques that are considered to be standard in Chinese culture. For example, vegetables are cut into small pieces and eaten with chopsticks. The Chinese have a long history of using chopsticks. The Chinese also often leave fish and meat with bones. According to them, this makes the food more delicious. Steaming is a very popular form of cooking. In addition, frying food with cooking oil is also commonly used."
     },
     {
      "id": "para5",
      "code": "Paragraph E",
      "content": "The most common way for Chinese people to eat is street food. It is very common to see stalls selling all kinds of food on both sides of the road. This has become a part of the food culture. For large dining events, the food is often placed in the middle of the table so that guests can try different dishes. The meal is served with tea and sometimes rice wine from the local area."
     },
     {
      "id": "para6",
      "code": "Paragraph F",
      "content": "There are signs that Chinese food culture and eating habits are changing. Chinese people now consume a wide variety of foods from many different countries. People in cities also prefer fast and convenient foods. In addition, some traditional products such as milk are consumed less by Chinese people than in the past."
     },
     {
      "id": "para7",
      "code": "Paragraph G",
      "content": "The change in Chinese eating habits has a global impact. Due to its huge population, the food demand of the Chinese market will directly affect domestic and international food production. The change in diet leads to problems such as the increase in related diseases that a large economy like China is prone to. Therefore, achieving a balance like the yin-yang philosophy in Chinese culinary culture is clearly a big challenge."
     }
    ],
    "rightItems": [
     {
      "id": "h1",
      "code": "1",
      "content": "The style of eating"
     },
     {
      "id": "h2",
      "code": "2",
      "content": "Regional variations"
     },
     {
      "id": "h3",
      "code": "3",
      "content": "Changes in the Chinese diets"
     },
     {
      "id": "h4",
      "code": "4",
      "content": "The influence of philosophy"
     },
     {
      "id": "h5",
      "code": "5",
      "content": "Effects of a changing diet"
     },
     {
      "id": "h6",
      "code": "6",
      "content": "Cooking methods"
     },
     {
      "id": "h7",
      "code": "7",
      "content": "The origins of chinese food"
     }
    ],
    "constraints": {
     "pointsPerCorrect": 2
    },
    "rubricCode": null,
    "answerKey": {
     "type": "MATCHING",
     "selectedOptionId": null,
     "selectedOptionIds": [],
     "matches": {
      "para1": "h7",
      "para2": "h4",
      "para3": "h2",
      "para4": "h6",
      "para5": "h1",
      "para6": "h3",
      "para7": "h5"
     },
     "orderedOptionIds": [],
     "acceptedValues": [],
     "caseSensitive": false
    }
   }
  ],
  "assets": [],
  "settings": {
   "shuffleOptions": true,
   "shuffleItems": false,
   "maxAudioPlays": null,
   "showAnswerAfterEachItem": false,
   "allowReview": true
  },
  "scoring": {
   "strategy": "PARTIAL_MATCH",
   "partialCredit": true,
   "maxScore": 14
  }
 },
 {
  "_id": "b4000000-0000-4000-8000-000000000021",
  "questionSetId": "b4000000-0000-4000-8000-000000000021",
  "revision": 1,
  "schemaVersion": 1,
  "partId": "16000000-0000-4000-8000-000000000014",
  "taskTypeCode": "HEADING_MATCHING",
  "title": "Meatless diet",
  "instructions": "Đọc bài văn và ghép tiêu đề phù hợp với từng đoạn.",
  "accessLevel": "PREMIUM",
  "stimulus": {
   "format": "PLAIN_TEXT",
   "value": "Topic: Meatless diet"
  },
  "sections": [],
  "items": [
   {
    "id": "item_1",
    "sequenceNo": 1,
    "prompt": {
     "format": "PLAIN_TEXT",
     "value": "Ghép mỗi đoạn văn với tiêu đề phù hợp."
    },
    "responseType": "MATCHING",
    "required": true,
    "maxScore": 14,
    "options": [],
    "leftItems": [
     {
      "id": "para1",
      "code": "Paragraph A",
      "content": "Vegetarianism is not a single dietary choice but includes many different forms. Some vegetarians avoid meat but still eat dairy and eggs-these are called lacto-ovo vegetarians. Others, like vegans, avoid all animal-derived products, including honey and gelatin. There are also pescatarians, who exclude meat but still consume fish. Flexitarians mostly eat plant-based foods but occasionally include meat or fish. These variations show that a meatless diet can be adapted to individual needs and beliefs, making it a flexible and increasingly popular choice for people around the world."
     },
     {
      "id": "para2",
      "code": "Paragraph B",
      "content": "People adopt meatless diets for many different reasons. For some, religious beliefs guide their eating habits, while others avoid meat out of concern for animal welfare. Some are motivated by environmental issues, believing that reducing meat consumption lowers their carbon footprint. Health is also a major factor, as some studies link vegetarian diets to lower risks of heart disease and diabetes. The motivations are as varied as the people who choose them, and it's not uncommon for individuals to follow a plant-based lifestyle for a combination of reasons."
     },
     {
      "id": "para3",
      "code": "Paragraph C",
      "content": "Many people wonder if it's truly possible to live without eating meat. The answer is yes, as proven by millions of vegetarians and vegans worldwide. While it requires some planning to ensure a balanced intake of protein, iron, and vitamin B12, plant-based diets can be nutritionally complete. In fact, major health organizations have stated that well-planned vegetarian and vegan diets are suitable for all stages of life, including childhood and pregnancy. With a variety of plant-based options now available, choosing a meatless lifestyle is more practical than ever."
     },
     {
      "id": "para4",
      "code": "Paragraph D",
      "content": "Factory farming-the industrialized method of raising animals for food-has been criticized for its negative effects on both animals and the environment. Animals are often kept in cramped, stressful conditions, and the use of antibiotics to promote growth raises concerns about resistance. Additionally, factory farms contribute to pollution and greenhouse gas emissions. These harmful impacts are among the key reasons why some people choose to reduce or eliminate meat from their diet. Supporting ethical and sustainable food sources is becoming a growing priority for many consumers."
     },
     {
      "id": "para5",
      "code": "Paragraph E",
      "content": "At the core of many vegetarian beliefs is the idea of respecting all forms of life. For some, avoiding meat is a moral decision rooted in the belief that animals have the right to live without suffering. This perspective emphasizes empathy, compassion, and non-violence. It is also reflected in certain spiritual or religious practices where harming living beings is discouraged. Choosing a meatless diet becomes more than just a personal choice-it represents a commitment to treating all creatures with dignity and care."
     },
     {
      "id": "para6",
      "code": "Paragraph F",
      "content": "A common benefit reported by people who switch to a plant-based diet is improved health. Many experience lower cholesterol levels, better digestion, and increased energy. Vegetarian diets are often rich in fiber, antioxidants, and healthy fats. Studies show that people who consume more fruits, vegetables, whole grains, and legumes tend to have lower risks of heart disease and obesity. However, balance is key-a diet full of processed plant foods can still be unhealthy. When done right, a meatless diet can be a strong foundation for a healthy lifestyle."
     },
     {
      "id": "para7",
      "code": "Paragraph G",
      "content": "Reducing meat consumption can also be seen as a global responsibility. Livestock farming is a major contributor to climate change, water usage, and deforestation. By choosing plant-based options, individuals can lower their environmental impact and support a more sustainable food system. Small changes made by many people can have a big collective effect. From conserving water to reducing greenhouse gas emissions, a meatless diet can be a meaningful step toward addressing some of the planet’s most urgent environmental challenges."
     }
    ],
    "rightItems": [
     {
      "id": "h1",
      "code": "1",
      "content": "Health gets better with diet"
     },
     {
      "id": "h2",
      "code": "2",
      "content": "Our responsibilities for global"
     },
     {
      "id": "h3",
      "code": "3",
      "content": "Respect the life"
     },
     {
      "id": "h4",
      "code": "4",
      "content": "Various explanations"
     },
     {
      "id": "h5",
      "code": "5",
      "content": "Types of Vegetarian"
     },
     {
      "id": "h6",
      "code": "6",
      "content": "Factory farming - it is a harmful thing"
     },
     {
      "id": "h7",
      "code": "7",
      "content": "Possible to happen"
     }
    ],
    "constraints": {
     "pointsPerCorrect": 2
    },
    "rubricCode": null,
    "answerKey": {
     "type": "MATCHING",
     "selectedOptionId": null,
     "selectedOptionIds": [],
     "matches": {
      "para1": "h5",
      "para2": "h4",
      "para3": "h7",
      "para4": "h6",
      "para5": "h3",
      "para6": "h1",
      "para7": "h2"
     },
     "orderedOptionIds": [],
     "acceptedValues": [],
     "caseSensitive": false
    }
   }
  ],
  "assets": [],
  "settings": {
   "shuffleOptions": true,
   "shuffleItems": false,
   "maxAudioPlays": null,
   "showAnswerAfterEachItem": false,
   "allowReview": true
  },
  "scoring": {
   "strategy": "PARTIAL_MATCH",
   "partialCredit": true,
   "maxScore": 14
  }
 },
 {
  "_id": "b4000000-0000-4000-8000-000000000022",
  "questionSetId": "b4000000-0000-4000-8000-000000000022",
  "revision": 1,
  "schemaVersion": 1,
  "partId": "16000000-0000-4000-8000-000000000014",
  "taskTypeCode": "HEADING_MATCHING",
  "title": "Zoo",
  "instructions": "Đọc bài văn và ghép tiêu đề phù hợp với từng đoạn.",
  "accessLevel": "PREMIUM",
  "stimulus": {
   "format": "PLAIN_TEXT",
   "value": "Topic: Zoo"
  },
  "sections": [],
  "items": [
   {
    "id": "item_1",
    "sequenceNo": 1,
    "prompt": {
     "format": "PLAIN_TEXT",
     "value": "Ghép mỗi đoạn văn với tiêu đề phù hợp."
    },
    "responseType": "MATCHING",
    "required": true,
    "maxScore": 14,
    "options": [],
    "leftItems": [
     {
      "id": "para1",
      "code": "Paragraph A",
      "content": "A zoo (short for zoological garden; also called an animal park or menagerie) is a facility in which animals are kept within enclosures for public exhibition and often bred for conservation purposes. The term zoological garden refers to zoology, the study of animals. The abbreviation zoo was first used of the London Zoological Gardens, which was opened for scientific study in 1828, and to the public in 1847. In the early days, the zoo was opened to serve the wealthy and high-status people in society."
     },
     {
      "id": "para2",
      "code": "Paragraph B",
      "content": "Later, it was realized that humans were curious about strange things. Large predators such as lions, bears or rare animals often caused great interest and could attract many people to see them. For that reason, some zoos opened their doors and welcomed all the people. It is noteworthy that in addition to animals, some zoos also displayed humans. Humans were occasionally displayed in cages at zoos along with non-human animals, to illustrate the differences between people of European and non-European origin. This attracted even more attention from the public - people who saw animals or people who were completely unfamiliar to them for the first time."
     },
     {
      "id": "para3",
      "code": "Paragraph C",
      "content": "In the early days, the sole purpose of zoos was entertainment. People simply went to zoos to see things that interested them or that they thought were strange. As time went on, people’s need for information increased. People always asked questions about the things they saw in zoos, such as where they came from, what their previous habitats were, how they reproduced, etc. This led the zookeepers to decide to add that knowledge to the cages in zoos."
     },
     {
      "id": "para4",
      "code": "Paragraph D",
      "content": "In large animals, a limited number of spaces were available in zoos. As a consequence, in the early days, these animals were kept in cramped cages where they could only survive. This greatly reduced the life expectancy of animals in zoos. Later, the government and zoo managers decided to expand the area where the animals were kept. This was also a humane move. In some places, people even arranged the environment to be closer to the wild environment so that the animals could have more space to move. This change in living space improved the quality of life of many animals. Many of them began to reproduce in the zoo's captive environment."
     },
     {
      "id": "para5",
      "code": "Paragraph E",
      "content": "Today, zoos have set themselves apart from other entertainment programs by declaring their role to be education and development of science and awareness among people rather than simply entertainment. In addition, many zoos also carry out conservation or rescue projects for wild animals. There are even some species that only exist in modern zoos and no longer exist in the natural environment."
     },
     {
      "id": "para6",
      "code": "Paragraph F",
      "content": "Over time, the educational mission of zoos has evolved. Today zoos are organized to provide both entertainment and education. This has led to a growing appreciation of wildlife and the urgent need to protect biodiversity. It has been shown that this mission is essential to prevent the loss of valuable animal genetic resources."
     },
     {
      "id": "para7",
      "code": "Paragraph G",
      "content": "It has been shown that zoos are no longer simply places for entertainment but are also considered places for education and conservation. Students will no longer have to learn about animals through books alone and the conservation of endangered species does not need to be organized in projects in the forest anymore."
     }
    ],
    "rightItems": [
     {
      "id": "h1",
      "code": "1",
      "content": "Away from amusement towards instruction"
     },
     {
      "id": "h2",
      "code": "2",
      "content": "A modern day alternative"
     },
     {
      "id": "h3",
      "code": "3",
      "content": "A different set of values"
     },
     {
      "id": "h4",
      "code": "4",
      "content": "Symbol of privilege and wealth"
     },
     {
      "id": "h5",
      "code": "5",
      "content": "Away from enclosure towards greater freedom"
     },
     {
      "id": "h6",
      "code": "6",
      "content": "A new mission of conservation"
     },
     {
      "id": "h7",
      "code": "7",
      "content": "Opening the door for everyone"
     }
    ],
    "constraints": {
     "pointsPerCorrect": 2
    },
    "rubricCode": null,
    "answerKey": {
     "type": "MATCHING",
     "selectedOptionId": null,
     "selectedOptionIds": [],
     "matches": {
      "para1": "h4",
      "para2": "h7",
      "para3": "h1",
      "para4": "h5",
      "para5": "h3",
      "para6": "h6",
      "para7": "h2"
     },
     "orderedOptionIds": [],
     "acceptedValues": [],
     "caseSensitive": false
    }
   }
  ],
  "assets": [],
  "settings": {
   "shuffleOptions": true,
   "shuffleItems": false,
   "maxAudioPlays": null,
   "showAnswerAfterEachItem": false,
   "allowReview": true
  },
  "scoring": {
   "strategy": "PARTIAL_MATCH",
   "partialCredit": true,
   "maxScore": 14
  }
 },
 {
  "_id": "b4000000-0000-4000-8000-000000000023",
  "questionSetId": "b4000000-0000-4000-8000-000000000023",
  "revision": 1,
  "schemaVersion": 1,
  "partId": "16000000-0000-4000-8000-000000000014",
  "taskTypeCode": "HEADING_MATCHING",
  "title": "Cultural Exchange",
  "instructions": "Đọc bài văn và ghép tiêu đề phù hợp với từng đoạn.",
  "accessLevel": "PREMIUM",
  "stimulus": {
   "format": "PLAIN_TEXT",
   "value": "Topic: Cultural Exchange"
  },
  "sections": [],
  "items": [
   {
    "id": "item_1",
    "sequenceNo": 1,
    "prompt": {
     "format": "PLAIN_TEXT",
     "value": "Ghép mỗi đoạn văn với tiêu đề phù hợp."
    },
    "responseType": "MATCHING",
    "required": true,
    "maxScore": 14,
    "options": [],
    "leftItems": [
     {
      "id": "para1",
      "code": "Paragraph A",
      "content": "People can encounter foreign music, films, food, and opinions without leaving home, but exposure alone does not guarantee understanding. New customs are often interpreted through assumptions learned in one's own society. Real learning begins when individuals ask why a practice matters to those who follow it and accept that familiar behavior is not universally normal. Repeated contact can then replace a simple contrast between 'us' and 'them' with a more complex view of how identity and tradition are formed."
     },
     {
      "id": "para2",
      "code": "Paragraph B",
      "content": "A town event that places several national traditions side by side can do more than provide entertainment. Preparing performances and food stalls requires residents to explain customs, negotiate how they are represented, and work with people they might not otherwise meet. Visitors may arrive for music or food but leave with questions about the histories behind them. The strongest events avoid presenting cultures as fixed costumes and instead create conversation between the groups taking part."
     },
     {
      "id": "para3",
      "code": "Paragraph C",
      "content": "Textbooks can teach grammar and vocabulary, yet they cannot fully prepare learners for accents, hesitation, humor, or the need to repair a misunderstanding. Regular conversations with partners in another country expose students to these unpredictable features while giving both sides a reason to communicate. Participants also discover that fluent interaction depends on patience and curiosity, not just accuracy. The result is often greater confidence in speaking and a less simplified picture of the people whose language they are studying."
     },
     {
      "id": "para4",
      "code": "Paragraph D",
      "content": "Tourism can provide income that helps maintain historic buildings and traditional crafts. Problems arise when ceremonies are shortened for tour schedules, sacred practices are performed repeatedly for photographs, or local goods are redesigned only to match visitors' expectations. Residents may then earn money from a version of their culture over which they have little control. The central question is whether tourism supports a living tradition or gradually replaces it with a product created mainly for sale."
     },
     {
      "id": "para5",
      "code": "Paragraph E",
      "content": "A tradition rarely disappears in a single moment. It may weaken when children stop learning a local language, skilled craftspeople cannot find apprentices, or celebrations are moved away from the communities that created them. At the same time, refusing all change can turn heritage into something displayed rather than lived. Protection therefore involves deciding which meanings must be carried forward and which forms can adapt, while ensuring that those decisions remain with the people to whom the tradition belongs."
     },
     {
      "id": "para6",
      "code": "Paragraph F",
      "content": "Simply learning facts about another group does not always reduce hostility; information can be selected to confirm what people already believe. More constructive contact occurs when participants have equal status, cooperate on a shared task, and are able to question misunderstandings without humiliation. Under these conditions, difference becomes something to negotiate rather than fear. Trust develops not from pretending that disagreements do not exist, but from discovering that disagreement can be handled fairly and without denying another person's dignity."
     },
     {
      "id": "para7",
      "code": "Paragraph G",
      "content": "Many visitors now prefer cooking with a local family, learning a craft, or spending time in an ordinary neighborhood to following a route of famous sights. Such activities can offer a richer understanding of daily life, but only when residents choose how to participate and receive a fair share of the benefit. An experience is not meaningful merely because it occurs away from a tourist center. Its value depends on genuine interaction rather than a carefully staged impression of local life."
     }
    ],
    "rightItems": [
     {
      "id": "h1",
      "code": "1",
      "content": "Encouraging Cross-Cultural Festivals"
     },
     {
      "id": "h2",
      "code": "2",
      "content": "Concerns About Cultural Preservation"
     },
     {
      "id": "h3",
      "code": "3",
      "content": "Promoting Language Exchange Programs"
     },
     {
      "id": "h4",
      "code": "4",
      "content": "Redefining Global Cultural Understanding"
     },
     {
      "id": "h5",
      "code": "5",
      "content": "Focusing on Authentic Cultural Experiences"
     },
     {
      "id": "h6",
      "code": "6",
      "content": "Building Mutual Respect Among Communities"
     },
     {
      "id": "h7",
      "code": "7",
      "content": "Overemphasis on Commercial Tourism"
     }
    ],
    "constraints": {
     "pointsPerCorrect": 2
    },
    "rubricCode": null,
    "answerKey": {
     "type": "MATCHING",
     "selectedOptionId": null,
     "selectedOptionIds": [],
     "matches": {
      "para1": "h4",
      "para2": "h1",
      "para3": "h3",
      "para4": "h7",
      "para5": "h2",
      "para6": "h6",
      "para7": "h5"
     },
     "orderedOptionIds": [],
     "acceptedValues": [],
     "caseSensitive": false
    }
   }
  ],
  "assets": [],
  "settings": {
   "shuffleOptions": true,
   "shuffleItems": false,
   "maxAudioPlays": null,
   "showAnswerAfterEachItem": false,
   "allowReview": true
  },
  "scoring": {
   "strategy": "PARTIAL_MATCH",
   "partialCredit": true,
   "maxScore": 14
  }
 },
 {
  "_id": "b4000000-0000-4000-8000-000000000024",
  "questionSetId": "b4000000-0000-4000-8000-000000000024",
  "revision": 1,
  "schemaVersion": 1,
  "partId": "16000000-0000-4000-8000-000000000014",
  "taskTypeCode": "HEADING_MATCHING",
  "title": "Tulips",
  "instructions": "Đọc bài văn và ghép tiêu đề phù hợp với từng đoạn.",
  "accessLevel": "PREMIUM",
  "stimulus": {
   "format": "PLAIN_TEXT",
   "value": "Topic: Tulips"
  },
  "sections": [],
  "items": [
   {
    "id": "item_1",
    "sequenceNo": 1,
    "prompt": {
     "format": "PLAIN_TEXT",
     "value": "Ghép mỗi đoạn văn với tiêu đề phù hợp."
    },
    "responseType": "MATCHING",
    "required": true,
    "maxScore": 14,
    "options": [],
    "leftItems": [
     {
      "id": "para1",
      "code": "Paragraph A",
      "content": "During the Dutch Golden Age in the 17th century, the Netherlands experienced a period of immense wealth and cultural development. Trade, science, and the arts flourished, creating a thriving middle class with disposable income. This prosperity led to a growing interest in luxury items, including rare flowers such as tulips. The booming economy encouraged speculative investments, and tulips quickly became a symbol of wealth and social status. Their rising popularity was not merely about beauty but about prestige-owning exotic tulips was a way to showcase one's success in this golden era."
     },
     {
      "id": "para2",
      "code": "Paragraph B",
      "content": "Tulips first gained popularity in the Ottoman Empire and later spread to Western Europe. When they arrived in the Netherlands, they became an instant sensation. Their bold colors and unique shapes captivated people, and soon tulips were planted in aristocratic gardens and depicted in still-life paintings. The flower’s visual appeal made it highly desirable among the wealthy and artistic communities. By the early 1600s, tulips had become one of the most fashionable items in Dutch society, and their fame began to outshine other plants traditionally valued in Europe."
     },
     {
      "id": "para3",
      "code": "Paragraph C",
      "content": "As their popularity increased, tulips transitioned from decorative items to commodities. They began to be sold in markets, sometimes even before they had bloomed. Merchants treated tulip bulbs like valuable assets, often purchasing them based on future availability. Buyers and sellers exchanged contracts instead of the actual flowers, betting on future prices. This speculative behavior turned the tulip into more than just a flower-it became a financial instrument, with its value fluctuating daily based on market trends and demand."
     },
     {
      "id": "para4",
      "code": "Paragraph D",
      "content": "There are hundreds of tulip varieties, differing in color, shape, and pattern. Some of the most prized tulips during the 17th century were those with unique stripes or flame-like markings on their petals. These effects were later discovered to be caused by a virus affecting the flower, but at the time they were considered extremely rare and beautiful. Breeders carefully cultivated new hybrids, and collectors paid large sums for bulbs with unusual appearances. This diversity in types helped fuel the tulip craze, as people competed to own the most exotic specimens."
     },
     {
      "id": "para5",
      "code": "Paragraph E",
      "content": "The tulip trade operated on a complex system of contracts, options, and informal agreements. Because bulbs bloom only once a year, buyers often agreed on future purchases, sometimes without even seeing the flower. Specialized markets were established where traders could buy and sell tulip futures. Prices were agreed upon months in advance, and payments were made when the bulbs were delivered. This abstract trading model made it easier for speculators to participate, but it also disconnected the trade from the real value of the product itself."
     },
     {
      "id": "para6",
      "code": "Paragraph F",
      "content": "Tulip trading wasn’t limited to the Netherlands. As demand grew, bulbs were shipped across Europe-from France to England and beyond. Traders carried these rare goods by land and sea, navigating a web of routes and tariffs. Each region had its own preferences, and what was fashionable in Amsterdam might not be as popular in Paris. Nonetheless, tulips remained a desirable item among European elites, and international trade routes helped spread both the flower and its financial influence across the continent."
     },
     {
      "id": "para7",
      "code": "Paragraph G",
      "content": "The tulip market collapsed suddenly in 1637. After years of increasing prices and wild speculation, confidence disappeared overnight. Buyers stopped showing up to auctions, and contracts became worthless. Panic spread, and traders who had invested heavily were left with massive debts and unsellable bulbs. This event, often referred to as the first economic bubble in history, highlighted the dangers of speculative markets. The tulip crash left a deep impact on the Dutch economy and became a cautionary tale still taught in economics courses today."
     }
    ],
    "rightItems": [
     {
      "id": "h1",
      "code": "1",
      "content": "Trade mechanics"
     },
     {
      "id": "h2",
      "code": "2",
      "content": "Coming into fashion"
     },
     {
      "id": "h3",
      "code": "3",
      "content": "An Unexpected turn of events"
     },
     {
      "id": "h4",
      "code": "4",
      "content": "The economy during the Golden Age"
     },
     {
      "id": "h5",
      "code": "5",
      "content": "Trade across Europe"
     },
     {
      "id": "h6",
      "code": "6",
      "content": "An object of trade"
     },
     {
      "id": "h7",
      "code": "7",
      "content": "Different types of tulip"
     }
    ],
    "constraints": {
     "pointsPerCorrect": 2
    },
    "rubricCode": null,
    "answerKey": {
     "type": "MATCHING",
     "selectedOptionId": null,
     "selectedOptionIds": [],
     "matches": {
      "para1": "h4",
      "para2": "h2",
      "para3": "h6",
      "para4": "h7",
      "para5": "h1",
      "para6": "h5",
      "para7": "h3"
     },
     "orderedOptionIds": [],
     "acceptedValues": [],
     "caseSensitive": false
    }
   }
  ],
  "assets": [],
  "settings": {
   "shuffleOptions": true,
   "shuffleItems": false,
   "maxAudioPlays": null,
   "showAnswerAfterEachItem": false,
   "allowReview": true
  },
  "scoring": {
   "strategy": "PARTIAL_MATCH",
   "partialCredit": true,
   "maxScore": 14
  }
 }
];

// Xoá đề cũ TRƯỚC rồi ghi đề mới: 11 đề cũ là bản tự tạo, không giữ lại.
const keep = DOCS.map(function (doc) { return doc._id; });
const removed = target.question_set_documents.deleteMany(
  { partId: PART_ID, _id: { $nin: keep } });
print('Da xoa ' + removed.deletedCount + ' de cu');

let n = 0;
DOCS.forEach(function (doc) {
  doc.revision = NumberInt(doc.revision);
  doc.schemaVersion = NumberInt(doc.schemaVersion);
  doc.items.forEach(function (item) { item.sequenceNo = NumberInt(item.sequenceNo); });
  doc.createdAt = new Date();
  doc.updatedAt = new Date();
  target.question_set_documents.replaceOne({ _id: doc._id }, doc, { upsert: true });
  n++;
});
print('Da upsert ' + n + ' de Reading Part 4');
print('Tong de Part 4 trong Mongo = ' +
  target.question_set_documents.countDocuments({ partId: PART_ID }));
