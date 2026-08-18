// SINH TỰ ĐỘNG bằng: node scripts/gen-reading-part2-bank.js
// Đừng sửa tay — sửa nguồn JSON rồi chạy lại lệnh trên.
const target = db.getSiblingDB('aptis');
const DOCS = [
 {
  "_id": "a2000000-0000-4000-8000-000000000037",
  "questionSetId": "a2000000-0000-4000-8000-000000000037",
  "revision": 1,
  "schemaVersion": 1,
  "partId": "16000000-0000-4000-8000-000000000012",
  "taskTypeCode": "SENTENCE_ORDERING",
  "title": "College Welcoming Day",
  "instructions": "Sắp xếp các câu theo thứ tự đúng để tạo thành một đoạn văn hoàn chỉnh.",
  "accessLevel": "PREMIUM",
  "stimulus": null,
  "sections": [],
  "items": [
   {
    "id": "item_1",
    "sequenceNo": 1,
    "prompt": null,
    "responseType": "ORDERING",
    "required": true,
    "maxScore": 5,
    "options": [
     {
      "id": "s1",
      "code": "A",
      "content": "At the end of the presentation, you will meet the heads of departments and lecturers."
     },
     {
      "id": "s2",
      "code": "B",
      "content": "Lunch will be provided on the second floor of the engineering building."
     },
     {
      "id": "s3",
      "code": "C",
      "content": "These staff members will then take you on a tour of the school's buildings and sports facilities in small groups."
     },
     {
      "id": "s4",
      "code": "D",
      "content": "Today will begin at 10 a.M. With a short presentation."
     },
     {
      "id": "s5",
      "code": "E",
      "content": "During this tour, you will need to stay with these staff members until lunchtime."
     }
    ],
    "leftItems": [],
    "rightItems": [],
    "constraints": {
     "pointsPerCorrect": 1
    },
    "rubricCode": null,
    "answerKey": {
     "type": "ORDERING",
     "selectedOptionId": null,
     "selectedOptionIds": [],
     "matches": {},
     "orderedOptionIds": [
      "s4",
      "s1",
      "s3",
      "s5",
      "s2"
     ],
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
   "strategy": "EXACT_MATCH",
   "partialCredit": true,
   "maxScore": 5
  }
 },
 {
  "_id": "a2000000-0000-4000-8000-000000000030",
  "questionSetId": "a2000000-0000-4000-8000-000000000030",
  "revision": 1,
  "schemaVersion": 1,
  "partId": "16000000-0000-4000-8000-000000000012",
  "taskTypeCode": "SENTENCE_ORDERING",
  "title": "Cultural festival",
  "instructions": "Sắp xếp các câu theo thứ tự đúng để tạo thành một đoạn văn hoàn chỉnh.",
  "accessLevel": "PREMIUM",
  "stimulus": null,
  "sections": [],
  "items": [
   {
    "id": "item_1",
    "sequenceNo": 1,
    "prompt": null,
    "responseType": "ORDERING",
    "required": true,
    "maxScore": 5,
    "options": [
     {
      "id": "s1",
      "code": "A",
      "content": "The event featured pottery workshops, folk music performances, and food tastings."
     },
     {
      "id": "s2",
      "code": "B",
      "content": "The cultural fair was held on Sunday, celebrating and showcasing local traditions."
     },
     {
      "id": "s3",
      "code": "C",
      "content": "Families enjoyed taking photos and sharing delicious local dishes together."
     },
     {
      "id": "s4",
      "code": "D",
      "content": "At the end of the event, prizes were given to participants with the best costumes."
     },
     {
      "id": "s5",
      "code": "E",
      "content": "About 60 participants took part, with Ms. Anna Green leading a traditional dance group."
     }
    ],
    "leftItems": [],
    "rightItems": [],
    "constraints": {
     "pointsPerCorrect": 1
    },
    "rubricCode": null,
    "answerKey": {
     "type": "ORDERING",
     "selectedOptionId": null,
     "selectedOptionIds": [],
     "matches": {},
     "orderedOptionIds": [
      "s2",
      "s5",
      "s1",
      "s3",
      "s4"
     ],
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
   "strategy": "EXACT_MATCH",
   "partialCredit": true,
   "maxScore": 5
  }
 },
 {
  "_id": "a2000000-0000-4000-8000-000000000003",
  "questionSetId": "a2000000-0000-4000-8000-000000000003",
  "revision": 1,
  "schemaVersion": 1,
  "partId": "16000000-0000-4000-8000-000000000012",
  "taskTypeCode": "SENTENCE_ORDERING",
  "title": "The famous singer",
  "instructions": "Sắp xếp các câu theo thứ tự đúng để tạo thành một đoạn văn hoàn chỉnh.",
  "accessLevel": "PREMIUM",
  "stimulus": null,
  "sections": [],
  "items": [
   {
    "id": "item_1",
    "sequenceNo": 1,
    "prompt": null,
    "responseType": "ORDERING",
    "required": true,
    "maxScore": 5,
    "options": [
     {
      "id": "s1",
      "code": "A",
      "content": "Before becoming famous, he had to practice very hard every day."
     },
     {
      "id": "s2",
      "code": "B",
      "content": "Thanks to his talent and personality, he became well-known to a large audience."
     },
     {
      "id": "s3",
      "code": "C",
      "content": "At the age of fifteen, he studied music at a special school."
     },
     {
      "id": "s4",
      "code": "D",
      "content": "He is now a famous singer who is loved by many fans."
     },
     {
      "id": "s5",
      "code": "E",
      "content": "With his unique style and clothes, he soon attracted attention."
     }
    ],
    "leftItems": [],
    "rightItems": [],
    "constraints": {
     "pointsPerCorrect": 1
    },
    "rubricCode": null,
    "answerKey": {
     "type": "ORDERING",
     "selectedOptionId": null,
     "selectedOptionIds": [],
     "matches": {},
     "orderedOptionIds": [
      "s3",
      "s1",
      "s5",
      "s2",
      "s4"
     ],
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
   "strategy": "EXACT_MATCH",
   "partialCredit": true,
   "maxScore": 5
  }
 },
 {
  "_id": "a2000000-0000-4000-8000-000000000006",
  "questionSetId": "a2000000-0000-4000-8000-000000000006",
  "revision": 1,
  "schemaVersion": 1,
  "partId": "16000000-0000-4000-8000-000000000012",
  "taskTypeCode": "SENTENCE_ORDERING",
  "title": "Movies then and now",
  "instructions": "Sắp xếp các câu theo thứ tự đúng để tạo thành một đoạn văn hoàn chỉnh.",
  "accessLevel": "PREMIUM",
  "stimulus": null,
  "sections": [],
  "items": [
   {
    "id": "item_1",
    "sequenceNo": 1,
    "prompt": null,
    "responseType": "ORDERING",
    "required": true,
    "maxScore": 5,
    "options": [
     {
      "id": "s1",
      "code": "A",
      "content": "In the old days, films were only in black and white, and sometimes even without sound."
     },
     {
      "id": "s2",
      "code": "B",
      "content": "Because of the lack of money, actors also earned little money from acting."
     },
     {
      "id": "s3",
      "code": "C",
      "content": "Movies today are very different from movies in the past."
     },
     {
      "id": "s4",
      "code": "D",
      "content": "Nowadays, everything has changed: actors and producers can earn a lot of money from producing films."
     },
     {
      "id": "s5",
      "code": "E",
      "content": "In addition to these technological limits, producers had very low budgets."
     }
    ],
    "leftItems": [],
    "rightItems": [],
    "constraints": {
     "pointsPerCorrect": 1
    },
    "rubricCode": null,
    "answerKey": {
     "type": "ORDERING",
     "selectedOptionId": null,
     "selectedOptionIds": [],
     "matches": {},
     "orderedOptionIds": [
      "s3",
      "s1",
      "s5",
      "s2",
      "s4"
     ],
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
   "strategy": "EXACT_MATCH",
   "partialCredit": true,
   "maxScore": 5
  }
 },
 {
  "_id": "a2000000-0000-4000-8000-000000000007",
  "questionSetId": "a2000000-0000-4000-8000-000000000007",
  "revision": 1,
  "schemaVersion": 1,
  "partId": "16000000-0000-4000-8000-000000000012",
  "taskTypeCode": "SENTENCE_ORDERING",
  "title": "The history of transportation",
  "instructions": "Sắp xếp các câu theo thứ tự đúng để tạo thành một đoạn văn hoàn chỉnh.",
  "accessLevel": "PREMIUM",
  "stimulus": null,
  "sections": [],
  "items": [
   {
    "id": "item_1",
    "sequenceNo": 1,
    "prompt": null,
    "responseType": "ORDERING",
    "required": true,
    "maxScore": 5,
    "options": [
     {
      "id": "s1",
      "code": "A",
      "content": "Later, trains and buses were introduced as more affordable ways to travel."
     },
     {
      "id": "s2",
      "code": "B",
      "content": "Today, buses, trains, and planes are all common transportation options."
     },
     {
      "id": "s3",
      "code": "C",
      "content": "These forms of transport made travelling more accessible to ordinary people."
     },
     {
      "id": "s4",
      "code": "D",
      "content": "In the past, transportation was mainly available to wealthy people."
     },
     {
      "id": "s5",
      "code": "E",
      "content": "Air travel then became popular, especially among business professionals."
     }
    ],
    "leftItems": [],
    "rightItems": [],
    "constraints": {
     "pointsPerCorrect": 1
    },
    "rubricCode": null,
    "answerKey": {
     "type": "ORDERING",
     "selectedOptionId": null,
     "selectedOptionIds": [],
     "matches": {},
     "orderedOptionIds": [
      "s4",
      "s1",
      "s3",
      "s5",
      "s2"
     ],
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
   "strategy": "EXACT_MATCH",
   "partialCredit": true,
   "maxScore": 5
  }
 },
 {
  "_id": "a2000000-0000-4000-8000-000000000014",
  "questionSetId": "a2000000-0000-4000-8000-000000000014",
  "revision": 1,
  "schemaVersion": 1,
  "partId": "16000000-0000-4000-8000-000000000012",
  "taskTypeCode": "SENTENCE_ORDERING",
  "title": "IoT - Internet of Things",
  "instructions": "Sắp xếp các câu theo thứ tự đúng để tạo thành một đoạn văn hoàn chỉnh.",
  "accessLevel": "PREMIUM",
  "stimulus": null,
  "sections": [],
  "items": [
   {
    "id": "item_1",
    "sequenceNo": 1,
    "prompt": null,
    "responseType": "ORDERING",
    "required": true,
    "maxScore": 5,
    "options": [
     {
      "id": "s1",
      "code": "A",
      "content": "Besides these technical issues, high development costs also slowed the widespread adoption of IoT technology."
     },
     {
      "id": "s2",
      "code": "B",
      "content": "The Internet of Things (IoT) links everyday devices to improve their capabilities."
     },
     {
      "id": "s3",
      "code": "C",
      "content": "Nowadays, engineers create smart devices for both residential and industrial applications."
     },
     {
      "id": "s4",
      "code": "D",
      "content": "These modern IoT systems provide real-time data tracking and automation features."
     },
     {
      "id": "s5",
      "code": "E",
      "content": "Early IoT devices faced limitations due to slow internet speeds and compatibility challenges."
     }
    ],
    "leftItems": [],
    "rightItems": [],
    "constraints": {
     "pointsPerCorrect": 1
    },
    "rubricCode": null,
    "answerKey": {
     "type": "ORDERING",
     "selectedOptionId": null,
     "selectedOptionIds": [],
     "matches": {},
     "orderedOptionIds": [
      "s2",
      "s5",
      "s1",
      "s3",
      "s4"
     ],
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
   "strategy": "EXACT_MATCH",
   "partialCredit": true,
   "maxScore": 5
  }
 },
 {
  "_id": "a2000000-0000-4000-8000-000000000020",
  "questionSetId": "a2000000-0000-4000-8000-000000000020",
  "revision": 1,
  "schemaVersion": 1,
  "partId": "16000000-0000-4000-8000-000000000012",
  "taskTypeCode": "SENTENCE_ORDERING",
  "title": "University open day",
  "instructions": "Sắp xếp các câu theo thứ tự đúng để tạo thành một đoạn văn hoàn chỉnh.",
  "accessLevel": "PREMIUM",
  "stimulus": null,
  "sections": [],
  "items": [
   {
    "id": "item_1",
    "sequenceNo": 1,
    "prompt": null,
    "responseType": "ORDERING",
    "required": true,
    "maxScore": 5,
    "options": [
     {
      "id": "s1",
      "code": "A",
      "content": "You’ll need to show this card to enter the introductory talk and morning lectures."
     },
     {
      "id": "s2",
      "code": "B",
      "content": "After the presentations, every visitor will have the chance to join a Q&A session with current students."
     },
     {
      "id": "s3",
      "code": "C",
      "content": "After the Q&A session, you will be able to explore different departments across the campus."
     },
     {
      "id": "s4",
      "code": "D",
      "content": "Before the open day, please contact us by phone or email so we can record your personal details."
     },
     {
      "id": "s5",
      "code": "E",
      "content": "Using this information, we will prepare an identification card for you to collect upon arrival."
     }
    ],
    "leftItems": [],
    "rightItems": [],
    "constraints": {
     "pointsPerCorrect": 1
    },
    "rubricCode": null,
    "answerKey": {
     "type": "ORDERING",
     "selectedOptionId": null,
     "selectedOptionIds": [],
     "matches": {},
     "orderedOptionIds": [
      "s4",
      "s5",
      "s1",
      "s2",
      "s3"
     ],
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
   "strategy": "EXACT_MATCH",
   "partialCredit": true,
   "maxScore": 5
  }
 },
 {
  "_id": "a2000000-0000-4000-8000-000000000011",
  "questionSetId": "a2000000-0000-4000-8000-000000000011",
  "revision": 1,
  "schemaVersion": 1,
  "partId": "16000000-0000-4000-8000-000000000012",
  "taskTypeCode": "SENTENCE_ORDERING",
  "title": "Workplace evolution",
  "instructions": "Sắp xếp các câu theo thứ tự đúng để tạo thành một đoạn văn hoàn chỉnh.",
  "accessLevel": "PREMIUM",
  "stimulus": null,
  "sections": [],
  "items": [
   {
    "id": "item_1",
    "sequenceNo": 1,
    "prompt": null,
    "responseType": "ORDERING",
    "required": true,
    "maxScore": 5,
    "options": [
     {
      "id": "s1",
      "code": "A",
      "content": "Limited technology once restricted remote work possibilities."
     },
     {
      "id": "s2",
      "code": "B",
      "content": "Another recent change is that companies are experimenting with shorter workweeks to boost productivity."
     },
     {
      "id": "s3",
      "code": "C",
      "content": "Modern workplaces are adopting more flexible work models."
     },
     {
      "id": "s4",
      "code": "D",
      "content": "In the past, employees followed strict nine-to-five schedules."
     },
     {
      "id": "s5",
      "code": "E",
      "content": "For example, managers now use software to track project progress remotely."
     }
    ],
    "leftItems": [],
    "rightItems": [],
    "constraints": {
     "pointsPerCorrect": 1
    },
    "rubricCode": null,
    "answerKey": {
     "type": "ORDERING",
     "selectedOptionId": null,
     "selectedOptionIds": [],
     "matches": {},
     "orderedOptionIds": [
      "s4",
      "s1",
      "s3",
      "s5",
      "s2"
     ],
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
   "strategy": "EXACT_MATCH",
   "partialCredit": true,
   "maxScore": 5
  }
 },
 {
  "_id": "a2000000-0000-4000-8000-000000000017",
  "questionSetId": "a2000000-0000-4000-8000-000000000017",
  "revision": 1,
  "schemaVersion": 1,
  "partId": "16000000-0000-4000-8000-000000000012",
  "taskTypeCode": "SENTENCE_ORDERING",
  "title": "Workplace evolution (phiên bản 2)",
  "instructions": "Sắp xếp các câu theo thứ tự đúng để tạo thành một đoạn văn hoàn chỉnh.",
  "accessLevel": "PREMIUM",
  "stimulus": null,
  "sections": [],
  "items": [
   {
    "id": "item_1",
    "sequenceNo": 1,
    "prompt": null,
    "responseType": "ORDERING",
    "required": true,
    "maxScore": 5,
    "options": [
     {
      "id": "s1",
      "code": "A",
      "content": "For example, managers now use digital tools to follow project progress remotely."
     },
     {
      "id": "s2",
      "code": "B",
      "content": "Because technology was limited, working from home was almost impossible."
     },
     {
      "id": "s3",
      "code": "C",
      "content": "Another modern change is that many companies are trying shorter workweeks to increase efficiency."
     },
     {
      "id": "s4",
      "code": "D",
      "content": "In the past, most workers followed fixed schedules from nine to five."
     },
     {
      "id": "s5",
      "code": "E",
      "content": "Modern offices are now moving toward more flexible ways of working."
     }
    ],
    "leftItems": [],
    "rightItems": [],
    "constraints": {
     "pointsPerCorrect": 1
    },
    "rubricCode": null,
    "answerKey": {
     "type": "ORDERING",
     "selectedOptionId": null,
     "selectedOptionIds": [],
     "matches": {},
     "orderedOptionIds": [
      "s4",
      "s2",
      "s5",
      "s1",
      "s3"
     ],
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
   "strategy": "EXACT_MATCH",
   "partialCredit": true,
   "maxScore": 5
  }
 },
 {
  "_id": "a2000000-0000-4000-8000-000000000010",
  "questionSetId": "a2000000-0000-4000-8000-000000000010",
  "revision": 1,
  "schemaVersion": 1,
  "partId": "16000000-0000-4000-8000-000000000012",
  "taskTypeCode": "SENTENCE_ORDERING",
  "title": "Company wellness day",
  "instructions": "Sắp xếp các câu theo thứ tự đúng để tạo thành một đoạn văn hoàn chỉnh.",
  "accessLevel": "PREMIUM",
  "stimulus": null,
  "sections": [],
  "items": [
   {
    "id": "item_1",
    "sequenceNo": 1,
    "prompt": null,
    "responseType": "ORDERING",
    "required": true,
    "maxScore": 5,
    "options": [
     {
      "id": "s1",
      "code": "A",
      "content": "Activities included team yoga, time management seminars, and a group walk."
     },
     {
      "id": "s2",
      "code": "B",
      "content": "This month, the wellness day took place on Friday, focusing on work-life balance."
     },
     {
      "id": "s3",
      "code": "C",
      "content": "Employees enjoyed healthy snacks and exchanged tips for managing stress."
     },
     {
      "id": "s4",
      "code": "D",
      "content": "After the workshops, awards were given for the most creative wellness ideas."
     },
     {
      "id": "s5",
      "code": "E",
      "content": "More than 50 employees participated, with Mr. James Smith leading a workshop on stress relief."
     }
    ],
    "leftItems": [],
    "rightItems": [],
    "constraints": {
     "pointsPerCorrect": 1
    },
    "rubricCode": null,
    "answerKey": {
     "type": "ORDERING",
     "selectedOptionId": null,
     "selectedOptionIds": [],
     "matches": {},
     "orderedOptionIds": [
      "s2",
      "s5",
      "s1",
      "s4",
      "s3"
     ],
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
   "strategy": "EXACT_MATCH",
   "partialCredit": true,
   "maxScore": 5
  }
 },
 {
  "_id": "a2000000-0000-4000-8000-000000000019",
  "questionSetId": "a2000000-0000-4000-8000-000000000019",
  "revision": 1,
  "schemaVersion": 1,
  "partId": "16000000-0000-4000-8000-000000000012",
  "taskTypeCode": "SENTENCE_ORDERING",
  "title": "Social Media",
  "instructions": "Sắp xếp các câu theo thứ tự đúng để tạo thành một đoạn văn hoàn chỉnh.",
  "accessLevel": "PREMIUM",
  "stimulus": null,
  "sections": [],
  "items": [
   {
    "id": "item_1",
    "sequenceNo": 1,
    "prompt": null,
    "responseType": "ORDERING",
    "required": true,
    "maxScore": 5,
    "options": [
     {
      "id": "s1",
      "code": "A",
      "content": "Today’s platforms use complex algorithms to personalize and shape each user’s feed."
     },
     {
      "id": "s2",
      "code": "B",
      "content": "At that time, slow internet speeds made streaming or uploading videos difficult."
     },
     {
      "id": "s3",
      "code": "C",
      "content": "As a result, many influencers now earn income primarily through brand sponsorships and online ads."
     },
     {
      "id": "s4",
      "code": "D",
      "content": "Early social media platforms offered only basic features like text posts and simple images."
     },
     {
      "id": "s5",
      "code": "E",
      "content": "Over time, social media platforms greatly evolved in both design and functionality."
     }
    ],
    "leftItems": [],
    "rightItems": [],
    "constraints": {
     "pointsPerCorrect": 1
    },
    "rubricCode": null,
    "answerKey": {
     "type": "ORDERING",
     "selectedOptionId": null,
     "selectedOptionIds": [],
     "matches": {},
     "orderedOptionIds": [
      "s4",
      "s2",
      "s5",
      "s1",
      "s3"
     ],
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
   "strategy": "EXACT_MATCH",
   "partialCredit": true,
   "maxScore": 5
  }
 },
 {
  "_id": "a2000000-0000-4000-8000-000000000009",
  "questionSetId": "a2000000-0000-4000-8000-000000000009",
  "revision": 1,
  "schemaVersion": 1,
  "partId": "16000000-0000-4000-8000-000000000012",
  "taskTypeCode": "SENTENCE_ORDERING",
  "title": "Artificial intelligence",
  "instructions": "Sắp xếp các câu theo thứ tự đúng để tạo thành một đoạn văn hoàn chỉnh.",
  "accessLevel": "PREMIUM",
  "stimulus": null,
  "sections": [],
  "items": [
   {
    "id": "item_1",
    "sequenceNo": 1,
    "prompt": null,
    "responseType": "ORDERING",
    "required": true,
    "maxScore": 5,
    "options": [
     {
      "id": "s1",
      "code": "A",
      "content": "In addition to these technical limits, high computational costs previously hindered the development of AI."
     },
     {
      "id": "s2",
      "code": "B",
      "content": "Over the past decade, artificial intelligence has revolutionized various industries."
     },
     {
      "id": "s3",
      "code": "C",
      "content": "Nowadays, AI engineers build advanced models for complex tasks such as language translation."
     },
     {
      "id": "s4",
      "code": "D",
      "content": "These modern AI tools help businesses analyze data and make better decisions."
     },
     {
      "id": "s5",
      "code": "E",
      "content": "Early AI systems were limited to simple pattern recognition tasks."
     }
    ],
    "leftItems": [],
    "rightItems": [],
    "constraints": {
     "pointsPerCorrect": 1
    },
    "rubricCode": null,
    "answerKey": {
     "type": "ORDERING",
     "selectedOptionId": null,
     "selectedOptionIds": [],
     "matches": {},
     "orderedOptionIds": [
      "s2",
      "s5",
      "s1",
      "s3",
      "s4"
     ],
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
   "strategy": "EXACT_MATCH",
   "partialCredit": true,
   "maxScore": 5
  }
 },
 {
  "_id": "a2000000-0000-4000-8000-000000000013",
  "questionSetId": "a2000000-0000-4000-8000-000000000013",
  "revision": 1,
  "schemaVersion": 1,
  "partId": "16000000-0000-4000-8000-000000000012",
  "taskTypeCode": "SENTENCE_ORDERING",
  "title": "Mae - The Math Girl",
  "instructions": "Sắp xếp các câu theo thứ tự đúng để tạo thành một đoạn văn hoàn chỉnh.",
  "accessLevel": "PREMIUM",
  "stimulus": null,
  "sections": [],
  "items": [
   {
    "id": "item_1",
    "sequenceNo": 1,
    "prompt": null,
    "responseType": "ORDERING",
    "required": true,
    "maxScore": 5,
    "options": [
     {
      "id": "s1",
      "code": "A",
      "content": "After completing the program, she joined a research team and contributed her skills and knowledge."
     },
     {
      "id": "s2",
      "code": "B",
      "content": "Mae worked diligently and achieved several remarkable academic milestones."
     },
     {
      "id": "s3",
      "code": "C",
      "content": "Mae’s father worked as a nurse, and her mother was a teacher."
     },
     {
      "id": "s4",
      "code": "D",
      "content": "These achievements eventually gave her the opportunity to join a training program in the United States."
     },
     {
      "id": "s5",
      "code": "E",
      "content": "Her parents motivated Mae to pursue higher education and focus on scientific studies."
     }
    ],
    "leftItems": [],
    "rightItems": [],
    "constraints": {
     "pointsPerCorrect": 1
    },
    "rubricCode": null,
    "answerKey": {
     "type": "ORDERING",
     "selectedOptionId": null,
     "selectedOptionIds": [],
     "matches": {},
     "orderedOptionIds": [
      "s3",
      "s5",
      "s2",
      "s4",
      "s1"
     ],
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
   "strategy": "EXACT_MATCH",
   "partialCredit": true,
   "maxScore": 5
  }
 },
 {
  "_id": "a2000000-0000-4000-8000-000000000021",
  "questionSetId": "a2000000-0000-4000-8000-000000000021",
  "revision": 1,
  "schemaVersion": 1,
  "partId": "16000000-0000-4000-8000-000000000012",
  "taskTypeCode": "SENTENCE_ORDERING",
  "title": "AI - Artificial Intelligence",
  "instructions": "Sắp xếp các câu theo thứ tự đúng để tạo thành một đoạn văn hoàn chỉnh.",
  "accessLevel": "PREMIUM",
  "stimulus": null,
  "sections": [],
  "items": [
   {
    "id": "item_1",
    "sequenceNo": 1,
    "prompt": null,
    "responseType": "ORDERING",
    "required": true,
    "maxScore": 5,
    "options": [
     {
      "id": "s1",
      "code": "A",
      "content": "In addition to these early limitations, high computational costs slowed down the progress of AI development."
     },
     {
      "id": "s2",
      "code": "B",
      "content": "Over the past decade, artificial intelligence has reshaped industries around the world."
     },
     {
      "id": "s3",
      "code": "C",
      "content": "Today, AI engineers design sophisticated models for applications such as language translation."
     },
     {
      "id": "s4",
      "code": "D",
      "content": "These modern AI tools enable businesses to analyze vast amounts of data and make smarter decisions."
     },
     {
      "id": "s5",
      "code": "E",
      "content": "Early AI systems were capable of handling only simple pattern recognition tasks."
     }
    ],
    "leftItems": [],
    "rightItems": [],
    "constraints": {
     "pointsPerCorrect": 1
    },
    "rubricCode": null,
    "answerKey": {
     "type": "ORDERING",
     "selectedOptionId": null,
     "selectedOptionIds": [],
     "matches": {},
     "orderedOptionIds": [
      "s2",
      "s5",
      "s1",
      "s3",
      "s4"
     ],
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
   "strategy": "EXACT_MATCH",
   "partialCredit": true,
   "maxScore": 5
  }
 },
 {
  "_id": "a2000000-0000-4000-8000-000000000022",
  "questionSetId": "a2000000-0000-4000-8000-000000000022",
  "revision": 1,
  "schemaVersion": 1,
  "partId": "16000000-0000-4000-8000-000000000012",
  "taskTypeCode": "SENTENCE_ORDERING",
  "title": "Healthy Eating",
  "instructions": "Sắp xếp các câu theo thứ tự đúng để tạo thành một đoạn văn hoàn chỉnh.",
  "accessLevel": "PREMIUM",
  "stimulus": null,
  "sections": [],
  "items": [
   {
    "id": "item_1",
    "sequenceNo": 1,
    "prompt": null,
    "responseType": "ORDERING",
    "required": true,
    "maxScore": 5,
    "options": [
     {
      "id": "s1",
      "code": "A",
      "content": "Years ago, limited access to fresh produce made healthy eating more difficult."
     },
     {
      "id": "s2",
      "code": "B",
      "content": "In addition to this expert advice, mobile apps now help users track calories and discover healthy recipes."
     },
     {
      "id": "s3",
      "code": "C",
      "content": "Modern diets now focus on fresh, whole foods instead of processed ones."
     },
     {
      "id": "s4",
      "code": "D",
      "content": "In the past, many meals were high in sugar and unhealthy fats."
     },
     {
      "id": "s5",
      "code": "E",
      "content": "Nutritionists today teach people how to plan balanced and nutritious meals."
     }
    ],
    "leftItems": [],
    "rightItems": [],
    "constraints": {
     "pointsPerCorrect": 1
    },
    "rubricCode": null,
    "answerKey": {
     "type": "ORDERING",
     "selectedOptionId": null,
     "selectedOptionIds": [],
     "matches": {},
     "orderedOptionIds": [
      "s4",
      "s1",
      "s3",
      "s5",
      "s2"
     ],
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
   "strategy": "EXACT_MATCH",
   "partialCredit": true,
   "maxScore": 5
  }
 },
 {
  "_id": "a2000000-0000-4000-8000-000000000023",
  "questionSetId": "a2000000-0000-4000-8000-000000000023",
  "revision": 1,
  "schemaVersion": 1,
  "partId": "16000000-0000-4000-8000-000000000012",
  "taskTypeCode": "SENTENCE_ORDERING",
  "title": "Wellness Fair",
  "instructions": "Sắp xếp các câu theo thứ tự đúng để tạo thành một đoạn văn hoàn chỉnh.",
  "accessLevel": "PREMIUM",
  "stimulus": null,
  "sections": [],
  "items": [
   {
    "id": "item_1",
    "sequenceNo": 1,
    "prompt": null,
    "responseType": "ORDERING",
    "required": true,
    "maxScore": 5,
    "options": [
     {
      "id": "s1",
      "code": "A",
      "content": "The fair also included activities like cooking demonstrations, mindfulness sessions, and a fun run."
     },
     {
      "id": "s2",
      "code": "B",
      "content": "The wellness fair took place on Saturday afternoon, encouraging people to adopt healthier lifestyles."
     },
     {
      "id": "s3",
      "code": "C",
      "content": "Families enjoyed tasting healthy snacks and discovering practical tips for better overall wellness."
     },
     {
      "id": "s4",
      "code": "D",
      "content": "At the end of the fair, prizes were awarded to participants who created the most creative health posters."
     },
     {
      "id": "s5",
      "code": "E",
      "content": "More than 60 participants joined the event, with Dr. Anna Lee leading an engaging fitness workshop."
     }
    ],
    "leftItems": [],
    "rightItems": [],
    "constraints": {
     "pointsPerCorrect": 1
    },
    "rubricCode": null,
    "answerKey": {
     "type": "ORDERING",
     "selectedOptionId": null,
     "selectedOptionIds": [],
     "matches": {},
     "orderedOptionIds": [
      "s2",
      "s5",
      "s1",
      "s3",
      "s4"
     ],
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
   "strategy": "EXACT_MATCH",
   "partialCredit": true,
   "maxScore": 5
  }
 },
 {
  "_id": "a2000000-0000-4000-8000-000000000024",
  "questionSetId": "a2000000-0000-4000-8000-000000000024",
  "revision": 1,
  "schemaVersion": 1,
  "partId": "16000000-0000-4000-8000-000000000012",
  "taskTypeCode": "SENTENCE_ORDERING",
  "title": "The famous singer (phiên bản 2)",
  "instructions": "Sắp xếp các câu theo thứ tự đúng để tạo thành một đoạn văn hoàn chỉnh.",
  "accessLevel": "PREMIUM",
  "stimulus": null,
  "sections": [],
  "items": [
   {
    "id": "item_1",
    "sequenceNo": 1,
    "prompt": null,
    "responseType": "ORDERING",
    "required": true,
    "maxScore": 5,
    "options": [
     {
      "id": "s1",
      "code": "A",
      "content": "His unique way of dressing and performing made him stand out from others."
     },
     {
      "id": "s2",
      "code": "B",
      "content": "He eventually became famous among audiences around the world."
     },
     {
      "id": "s3",
      "code": "C",
      "content": "Before becoming famous, he studied music at school when he was 15."
     },
     {
      "id": "s4",
      "code": "D",
      "content": "Today, he is a successful singer with many fans."
     },
     {
      "id": "s5",
      "code": "E",
      "content": "This helped him receive many invitations for collaborations and performances."
     }
    ],
    "leftItems": [],
    "rightItems": [],
    "constraints": {
     "pointsPerCorrect": 1
    },
    "rubricCode": null,
    "answerKey": {
     "type": "ORDERING",
     "selectedOptionId": null,
     "selectedOptionIds": [],
     "matches": {},
     "orderedOptionIds": [
      "s3",
      "s1",
      "s5",
      "s2",
      "s4"
     ],
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
   "strategy": "EXACT_MATCH",
   "partialCredit": true,
   "maxScore": 5
  }
 },
 {
  "_id": "a2000000-0000-4000-8000-000000000025",
  "questionSetId": "a2000000-0000-4000-8000-000000000025",
  "revision": 1,
  "schemaVersion": 1,
  "partId": "16000000-0000-4000-8000-000000000012",
  "taskTypeCode": "SENTENCE_ORDERING",
  "title": "The famous singer (phiên bản 3)",
  "instructions": "Sắp xếp các câu theo thứ tự đúng để tạo thành một đoạn văn hoàn chỉnh.",
  "accessLevel": "PREMIUM",
  "stimulus": null,
  "sections": [],
  "items": [
   {
    "id": "item_1",
    "sequenceNo": 1,
    "prompt": null,
    "responseType": "ORDERING",
    "required": true,
    "maxScore": 5,
    "options": [
     {
      "id": "s1",
      "code": "A",
      "content": "He spent years practicing and improving his performance skills."
     },
     {
      "id": "s2",
      "code": "B",
      "content": "He is now a famous singer who is loved by many people."
     },
     {
      "id": "s3",
      "code": "C",
      "content": "His unique clothing style and stage presence made him stand out."
     },
     {
      "id": "s4",
      "code": "D",
      "content": "Before becoming famous, he studied music at school when he was 15 years old."
     },
     {
      "id": "s5",
      "code": "E",
      "content": "Because of this, more and more people began to recognize and admire him."
     }
    ],
    "leftItems": [],
    "rightItems": [],
    "constraints": {
     "pointsPerCorrect": 1
    },
    "rubricCode": null,
    "answerKey": {
     "type": "ORDERING",
     "selectedOptionId": null,
     "selectedOptionIds": [],
     "matches": {},
     "orderedOptionIds": [
      "s4",
      "s1",
      "s3",
      "s5",
      "s2"
     ],
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
   "strategy": "EXACT_MATCH",
   "partialCredit": true,
   "maxScore": 5
  }
 },
 {
  "_id": "a2000000-0000-4000-8000-000000000029",
  "questionSetId": "a2000000-0000-4000-8000-000000000029",
  "revision": 1,
  "schemaVersion": 1,
  "partId": "16000000-0000-4000-8000-000000000012",
  "taskTypeCode": "SENTENCE_ORDERING",
  "title": "Work",
  "instructions": "Sắp xếp các câu theo thứ tự đúng để tạo thành một đoạn văn hoàn chỉnh.",
  "accessLevel": "PREMIUM",
  "stimulus": null,
  "sections": [],
  "items": [
   {
    "id": "item_1",
    "sequenceNo": 1,
    "prompt": null,
    "responseType": "ORDERING",
    "required": true,
    "maxScore": 5,
    "options": [
     {
      "id": "s1",
      "code": "A",
      "content": "At lunchtime, she enjoys a homemade sandwich prepared with fresh ingredients."
     },
     {
      "id": "s2",
      "code": "B",
      "content": "One employee uses a planner to organize her tasks throughout the shorter workweek."
     },
     {
      "id": "s3",
      "code": "C",
      "content": "In the evening, she relaxes by reading books on productivity and well-being."
     },
     {
      "id": "s4",
      "code": "D",
      "content": "The company offers flexible working hours to better support employees’ schedules."
     },
     {
      "id": "s5",
      "code": "E",
      "content": "She works at a white desk in the shared open office."
     }
    ],
    "leftItems": [],
    "rightItems": [],
    "constraints": {
     "pointsPerCorrect": 1
    },
    "rubricCode": null,
    "answerKey": {
     "type": "ORDERING",
     "selectedOptionId": null,
     "selectedOptionIds": [],
     "matches": {},
     "orderedOptionIds": [
      "s4",
      "s2",
      "s5",
      "s1",
      "s3"
     ],
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
   "strategy": "EXACT_MATCH",
   "partialCredit": true,
   "maxScore": 5
  }
 },
 {
  "_id": "a2000000-0000-4000-8000-000000000035",
  "questionSetId": "a2000000-0000-4000-8000-000000000035",
  "revision": 1,
  "schemaVersion": 1,
  "partId": "16000000-0000-4000-8000-000000000012",
  "taskTypeCode": "SENTENCE_ORDERING",
  "title": "Tech fair",
  "instructions": "Sắp xếp các câu theo thứ tự đúng để tạo thành một đoạn văn hoàn chỉnh.",
  "accessLevel": "PREMIUM",
  "stimulus": null,
  "sections": [],
  "items": [
   {
    "id": "item_1",
    "sequenceNo": 1,
    "prompt": null,
    "responseType": "ORDERING",
    "required": true,
    "maxScore": 5,
    "options": [
     {
      "id": "s1",
      "code": "A",
      "content": "After the demonstrations, awards were given to the creators of the most innovative products."
     },
     {
      "id": "s2",
      "code": "B",
      "content": "The event featured engaging activities such as VR gaming, coding workshops, and thrilling drone races."
     },
     {
      "id": "s3",
      "code": "C",
      "content": "The tech fair took place on Saturday morning, showcasing a variety of exciting new gadgets."
     },
     {
      "id": "s4",
      "code": "D",
      "content": "Visitors enjoyed complimentary coffee and snacks while exploring the interactive exhibits."
     },
     {
      "id": "s5",
      "code": "E",
      "content": "More than 60 exhibitors participated, with Mr. David Brown presenting an impressive robot demonstration."
     }
    ],
    "leftItems": [],
    "rightItems": [],
    "constraints": {
     "pointsPerCorrect": 1
    },
    "rubricCode": null,
    "answerKey": {
     "type": "ORDERING",
     "selectedOptionId": null,
     "selectedOptionIds": [],
     "matches": {},
     "orderedOptionIds": [
      "s3",
      "s5",
      "s2",
      "s1",
      "s4"
     ],
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
   "strategy": "EXACT_MATCH",
   "partialCredit": true,
   "maxScore": 5
  }
 },
 {
  "_id": "b2000000-0000-4000-8000-000000000016",
  "questionSetId": "b2000000-0000-4000-8000-000000000016",
  "revision": 1,
  "schemaVersion": 1,
  "partId": "16000000-0000-4000-8000-000000000012",
  "taskTypeCode": "SENTENCE_ORDERING",
  "title": "Instructions for new students.",
  "instructions": "Sắp xếp các câu theo thứ tự đúng để tạo thành một đoạn văn hoàn chỉnh.",
  "accessLevel": "PREMIUM",
  "stimulus": null,
  "sections": [],
  "items": [
   {
    "id": "item_1",
    "sequenceNo": 1,
    "prompt": null,
    "responseType": "ORDERING",
    "required": true,
    "maxScore": 5,
    "options": [
     {
      "id": "s1",
      "code": "A",
      "content": "When you arrive at the university, go to the help desk."
     },
     {
      "id": "s2",
      "code": "B",
      "content": "A member of staff will ask for your name and your address."
     },
     {
      "id": "s3",
      "code": "C",
      "content": "You can use this card to borrow books from the library and access lesson materials online."
     },
     {
      "id": "s4",
      "code": "D",
      "content": "He or she will enter your information into the computer and give you an identification card."
     },
     {
      "id": "s5",
      "code": "E",
      "content": "You will find the online lesson materials through links on your home page."
     }
    ],
    "leftItems": [],
    "rightItems": [],
    "constraints": {
     "pointsPerCorrect": 1
    },
    "rubricCode": null,
    "answerKey": {
     "type": "ORDERING",
     "selectedOptionId": null,
     "selectedOptionIds": [],
     "matches": {},
     "orderedOptionIds": [
      "s1",
      "s2",
      "s4",
      "s3",
      "s5"
     ],
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
   "strategy": "EXACT_MATCH",
   "partialCredit": true,
   "maxScore": 5
  }
 },
 {
  "_id": "b2000000-0000-4000-8000-000000000017",
  "questionSetId": "b2000000-0000-4000-8000-000000000017",
  "revision": 1,
  "schemaVersion": 1,
  "partId": "16000000-0000-4000-8000-000000000012",
  "taskTypeCode": "SENTENCE_ORDERING",
  "title": "Solve a problem.",
  "instructions": "Sắp xếp các câu theo thứ tự đúng để tạo thành một đoạn văn hoàn chỉnh.",
  "accessLevel": "PREMIUM",
  "stimulus": null,
  "sections": [],
  "items": [
   {
    "id": "item_1",
    "sequenceNo": 1,
    "prompt": null,
    "responseType": "ORDERING",
    "required": true,
    "maxScore": 5,
    "options": [
     {
      "id": "s1",
      "code": "A",
      "content": "You can also compare your results with experiments in the past."
     },
     {
      "id": "s2",
      "code": "B",
      "content": "In this way, you can add to your knowledge of the subject for future experiments."
     },
     {
      "id": "s3",
      "code": "C",
      "content": "The next one is to form a hypothesis or an idea based on your information."
     },
     {
      "id": "s4",
      "code": "D",
      "content": "The first step is to find out what you know about the problem."
     },
     {
      "id": "s5",
      "code": "E",
      "content": "Then, you need to perform experiments to see if these ideas are true or not."
     }
    ],
    "leftItems": [],
    "rightItems": [],
    "constraints": {
     "pointsPerCorrect": 1
    },
    "rubricCode": null,
    "answerKey": {
     "type": "ORDERING",
     "selectedOptionId": null,
     "selectedOptionIds": [],
     "matches": {},
     "orderedOptionIds": [
      "s4",
      "s3",
      "s5",
      "s1",
      "s2"
     ],
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
   "strategy": "EXACT_MATCH",
   "partialCredit": true,
   "maxScore": 5
  }
 },
 {
  "_id": "b2000000-0000-4000-8000-000000000022",
  "questionSetId": "b2000000-0000-4000-8000-000000000022",
  "revision": 1,
  "schemaVersion": 1,
  "partId": "16000000-0000-4000-8000-000000000012",
  "taskTypeCode": "SENTENCE_ORDERING",
  "title": "A famous football player",
  "instructions": "Sắp xếp các câu theo thứ tự đúng để tạo thành một đoạn văn hoàn chỉnh.",
  "accessLevel": "PREMIUM",
  "stimulus": null,
  "sections": [],
  "items": [
   {
    "id": "item_1",
    "sequenceNo": 1,
    "prompt": null,
    "responseType": "ORDERING",
    "required": true,
    "maxScore": 5,
    "options": [
     {
      "id": "s1",
      "code": "A",
      "content": "When he was a child, he played for some local teams near his home in Marseille"
     },
     {
      "id": "s2",
      "code": "B",
      "content": "Since he retired from playing, he has worked as a football club manager."
     },
     {
      "id": "s3",
      "code": "C",
      "content": "After that, he moved to Italy and Spain, where he finished his playing career"
     },
     {
      "id": "s4",
      "code": "D",
      "content": "While he was at that club, people throughout France saw that he was a brilliant player."
     },
     {
      "id": "s5",
      "code": "E",
      "content": "He then moved away from his home to join Cannes Football Club in the southern France"
     }
    ],
    "leftItems": [],
    "rightItems": [],
    "constraints": {
     "pointsPerCorrect": 1
    },
    "rubricCode": null,
    "answerKey": {
     "type": "ORDERING",
     "selectedOptionId": null,
     "selectedOptionIds": [],
     "matches": {},
     "orderedOptionIds": [
      "s1",
      "s5",
      "s4",
      "s3",
      "s2"
     ],
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
   "strategy": "EXACT_MATCH",
   "partialCredit": true,
   "maxScore": 5
  }
 },
 {
  "_id": "b2000000-0000-4000-8000-000000000023",
  "questionSetId": "b2000000-0000-4000-8000-000000000023",
  "revision": 1,
  "schemaVersion": 1,
  "partId": "16000000-0000-4000-8000-000000000012",
  "taskTypeCode": "SENTENCE_ORDERING",
  "title": "The process of entering a pet hospital.",
  "instructions": "Sắp xếp các câu theo thứ tự đúng để tạo thành một đoạn văn hoàn chỉnh.",
  "accessLevel": "PREMIUM",
  "stimulus": null,
  "sections": [],
  "items": [
   {
    "id": "item_1",
    "sequenceNo": 1,
    "prompt": null,
    "responseType": "ORDERING",
    "required": true,
    "maxScore": 5,
    "options": [
     {
      "id": "s1",
      "code": "A",
      "content": "When you arrive, go straight to the main office to collect your ticket."
     },
     {
      "id": "s2",
      "code": "B",
      "content": "Before you look at the pictures, a guide will tell you about the day's animal-care event."
     },
     {
      "id": "s3",
      "code": "C",
      "content": "Inside the building, you will find a photography exhibition on the ground floor."
     },
     {
      "id": "s4",
      "code": "D",
      "content": "Later, the animal-care activities will include playing with and feeding the animals."
     },
     {
      "id": "s5",
      "code": "E",
      "content": "You will need to show this ticket to a member of staff at the door before you enter."
     }
    ],
    "leftItems": [],
    "rightItems": [],
    "constraints": {
     "pointsPerCorrect": 1
    },
    "rubricCode": null,
    "answerKey": {
     "type": "ORDERING",
     "selectedOptionId": null,
     "selectedOptionIds": [],
     "matches": {},
     "orderedOptionIds": [
      "s1",
      "s5",
      "s3",
      "s2",
      "s4"
     ],
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
   "strategy": "EXACT_MATCH",
   "partialCredit": true,
   "maxScore": 5
  }
 },
 {
  "_id": "b2000000-0000-4000-8000-000000000025",
  "questionSetId": "b2000000-0000-4000-8000-000000000025",
  "revision": 1,
  "schemaVersion": 1,
  "partId": "16000000-0000-4000-8000-000000000012",
  "taskTypeCode": "SENTENCE_ORDERING",
  "title": "Tom Harper",
  "instructions": "Sắp xếp các câu theo thứ tự đúng để tạo thành một đoạn văn hoàn chỉnh.",
  "accessLevel": "PREMIUM",
  "stimulus": null,
  "sections": [],
  "items": [
   {
    "id": "item_1",
    "sequenceNo": 1,
    "prompt": null,
    "responseType": "ORDERING",
    "required": true,
    "maxScore": 5,
    "options": [
     {
      "id": "s1",
      "code": "A",
      "content": "He almost left the magazine, but then he decided to create some unusual new characters"
     },
     {
      "id": "s2",
      "code": "B",
      "content": "The characters he imagined were one of the most famous in the world"
     },
     {
      "id": "s3",
      "code": "C",
      "content": "When he was young, he began writing short stories for a magazine"
     },
     {
      "id": "s4",
      "code": "D",
      "content": "This popularity made Tom Harper rich and successful."
     },
     {
      "id": "s5",
      "code": "E",
      "content": "He soon wrote regularly for the magazine, but he was not satisfied"
     }
    ],
    "leftItems": [],
    "rightItems": [],
    "constraints": {
     "pointsPerCorrect": 1
    },
    "rubricCode": null,
    "answerKey": {
     "type": "ORDERING",
     "selectedOptionId": null,
     "selectedOptionIds": [],
     "matches": {},
     "orderedOptionIds": [
      "s3",
      "s5",
      "s1",
      "s2",
      "s4"
     ],
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
   "strategy": "EXACT_MATCH",
   "partialCredit": true,
   "maxScore": 5
  }
 },
 {
  "_id": "b2000000-0000-4000-8000-000000000026",
  "questionSetId": "b2000000-0000-4000-8000-000000000026",
  "revision": 1,
  "schemaVersion": 1,
  "partId": "16000000-0000-4000-8000-000000000012",
  "taskTypeCode": "SENTENCE_ORDERING",
  "title": "A scientist’s life - Albert Einstein",
  "instructions": "Sắp xếp các câu theo thứ tự đúng để tạo thành một đoạn văn hoàn chỉnh.",
  "accessLevel": "PREMIUM",
  "stimulus": null,
  "sections": [],
  "items": [
   {
    "id": "item_1",
    "sequenceNo": 1,
    "prompt": null,
    "responseType": "ORDERING",
    "required": true,
    "maxScore": 5,
    "options": [
     {
      "id": "s1",
      "code": "A",
      "content": "These were so advanced that he soon became famous all over the world"
     },
     {
      "id": "s2",
      "code": "B",
      "content": "As a child, he moved to a special school because he was so clever"
     },
     {
      "id": "s3",
      "code": "C",
      "content": "Princeton University in the USA offered him a job because he was so famous."
     },
     {
      "id": "s4",
      "code": "D",
      "content": "His best friend in his new class was a girl named Lavime"
     },
     {
      "id": "s5",
      "code": "E",
      "content": "She later became his wife and helped him with his earliest scientific discoveries"
     }
    ],
    "leftItems": [],
    "rightItems": [],
    "constraints": {
     "pointsPerCorrect": 1
    },
    "rubricCode": null,
    "answerKey": {
     "type": "ORDERING",
     "selectedOptionId": null,
     "selectedOptionIds": [],
     "matches": {},
     "orderedOptionIds": [
      "s2",
      "s4",
      "s5",
      "s1",
      "s3"
     ],
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
   "strategy": "EXACT_MATCH",
   "partialCredit": true,
   "maxScore": 5
  }
 },
 {
  "_id": "b2000000-0000-4000-8000-000000000027",
  "questionSetId": "b2000000-0000-4000-8000-000000000027",
  "revision": 1,
  "schemaVersion": 1,
  "partId": "16000000-0000-4000-8000-000000000012",
  "taskTypeCode": "SENTENCE_ORDERING",
  "title": "Delivery man",
  "instructions": "Sắp xếp các câu theo thứ tự đúng để tạo thành một đoạn văn hoàn chỉnh.",
  "accessLevel": "PREMIUM",
  "stimulus": null,
  "sections": [],
  "items": [
   {
    "id": "item_1",
    "sequenceNo": 1,
    "prompt": null,
    "responseType": "ORDERING",
    "required": true,
    "maxScore": 5,
    "options": [
     {
      "id": "s1",
      "code": "A",
      "content": "You must follow the route on the map to deliver packages"
     },
     {
      "id": "s2",
      "code": "B",
      "content": "When you have completed all deliveries, return to your office"
     },
     {
      "id": "s3",
      "code": "C",
      "content": "You should arrive at the main office by 6.30Am and collect your keys"
     },
     {
      "id": "s4",
      "code": "D",
      "content": "In the office, you can also collect a map of your route"
     },
     {
      "id": "s5",
      "code": "E",
      "content": "You must return your keys to the office manager after you get back"
     }
    ],
    "leftItems": [],
    "rightItems": [],
    "constraints": {
     "pointsPerCorrect": 1
    },
    "rubricCode": null,
    "answerKey": {
     "type": "ORDERING",
     "selectedOptionId": null,
     "selectedOptionIds": [],
     "matches": {},
     "orderedOptionIds": [
      "s3",
      "s4",
      "s1",
      "s2",
      "s5"
     ],
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
   "strategy": "EXACT_MATCH",
   "partialCredit": true,
   "maxScore": 5
  }
 },
 {
  "_id": "b2000000-0000-4000-8000-000000000028",
  "questionSetId": "b2000000-0000-4000-8000-000000000028",
  "revision": 1,
  "schemaVersion": 1,
  "partId": "16000000-0000-4000-8000-000000000012",
  "taskTypeCode": "SENTENCE_ORDERING",
  "title": "Enter the conference hall",
  "instructions": "Sắp xếp các câu theo thứ tự đúng để tạo thành một đoạn văn hoàn chỉnh.",
  "accessLevel": "PREMIUM",
  "stimulus": null,
  "sections": [],
  "items": [
   {
    "id": "item_1",
    "sequenceNo": 1,
    "prompt": null,
    "responseType": "ORDERING",
    "required": true,
    "maxScore": 5,
    "options": [
     {
      "id": "s1",
      "code": "A",
      "content": "Show your pass from the conference pack to a member of staff at the desk."
     },
     {
      "id": "s2",
      "code": "B",
      "content": "When you collect your pack, go to the lifts on the right."
     },
     {
      "id": "s3",
      "code": "C",
      "content": "He or she will tell you your seat number for the talk at the main hall."
     },
     {
      "id": "s4",
      "code": "D",
      "content": "Once you are in the hall, someone will help you find your seat."
     },
     {
      "id": "s5",
      "code": "E",
      "content": "Take the lift to the third floor and go to the main desk."
     }
    ],
    "leftItems": [],
    "rightItems": [],
    "constraints": {
     "pointsPerCorrect": 1
    },
    "rubricCode": null,
    "answerKey": {
     "type": "ORDERING",
     "selectedOptionId": null,
     "selectedOptionIds": [],
     "matches": {},
     "orderedOptionIds": [
      "s2",
      "s5",
      "s1",
      "s3",
      "s4"
     ],
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
   "strategy": "EXACT_MATCH",
   "partialCredit": true,
   "maxScore": 5
  }
 },
 {
  "_id": "b2000000-0000-4000-8000-000000000029",
  "questionSetId": "b2000000-0000-4000-8000-000000000029",
  "revision": 1,
  "schemaVersion": 1,
  "partId": "16000000-0000-4000-8000-000000000012",
  "taskTypeCode": "SENTENCE_ORDERING",
  "title": "Paperwork submission process",
  "instructions": "Sắp xếp các câu theo thứ tự đúng để tạo thành một đoạn văn hoàn chỉnh.",
  "accessLevel": "PREMIUM",
  "stimulus": null,
  "sections": [],
  "items": [
   {
    "id": "item_1",
    "sequenceNo": 1,
    "prompt": null,
    "responseType": "ORDERING",
    "required": true,
    "maxScore": 5,
    "options": [
     {
      "id": "s1",
      "code": "A",
      "content": "After you send your course work, you should check your email."
     },
     {
      "id": "s2",
      "code": "B",
      "content": "Simply drag or drop your files."
     },
     {
      "id": "s3",
      "code": "C",
      "content": "In your account, press \"open a new window\"."
     },
     {
      "id": "s4",
      "code": "D",
      "content": "Once you put the files there, press the \"send\" button."
     },
     {
      "id": "s5",
      "code": "E",
      "content": "When you do this, a new window will open."
     }
    ],
    "leftItems": [],
    "rightItems": [],
    "constraints": {
     "pointsPerCorrect": 1
    },
    "rubricCode": null,
    "answerKey": {
     "type": "ORDERING",
     "selectedOptionId": null,
     "selectedOptionIds": [],
     "matches": {},
     "orderedOptionIds": [
      "s3",
      "s5",
      "s2",
      "s4",
      "s1"
     ],
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
   "strategy": "EXACT_MATCH",
   "partialCredit": true,
   "maxScore": 5
  }
 },
 {
  "_id": "b2000000-0000-4000-8000-000000000031",
  "questionSetId": "b2000000-0000-4000-8000-000000000031",
  "revision": 1,
  "schemaVersion": 1,
  "partId": "16000000-0000-4000-8000-000000000012",
  "taskTypeCode": "SENTENCE_ORDERING",
  "title": "hand in assignment",
  "instructions": "Sắp xếp các câu theo thứ tự đúng để tạo thành một đoạn văn hoàn chỉnh.",
  "accessLevel": "PREMIUM",
  "stimulus": null,
  "sections": [],
  "items": [
   {
    "id": "item_1",
    "sequenceNo": 1,
    "prompt": null,
    "responseType": "ORDERING",
    "required": true,
    "maxScore": 5,
    "options": [
     {
      "id": "s1",
      "code": "A",
      "content": "When you are sure there are no mistakes left, print out your report"
     },
     {
      "id": "s2",
      "code": "B",
      "content": "Next, complete a cover sheet with your name and your student number, and attach it to your printed assignment"
     },
     {
      "id": "s3",
      "code": "C",
      "content": "The staff member will take your report and confirm that everything is complete."
     },
     {
      "id": "s4",
      "code": "D",
      "content": "First, it is a good idea to check your report and correct mistakes"
     },
     {
      "id": "s5",
      "code": "E",
      "content": "Bring your assignment with the attached cover sheet to the front desk in the main hall"
     }
    ],
    "leftItems": [],
    "rightItems": [],
    "constraints": {
     "pointsPerCorrect": 1
    },
    "rubricCode": null,
    "answerKey": {
     "type": "ORDERING",
     "selectedOptionId": null,
     "selectedOptionIds": [],
     "matches": {},
     "orderedOptionIds": [
      "s4",
      "s1",
      "s2",
      "s5",
      "s3"
     ],
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
   "strategy": "EXACT_MATCH",
   "partialCredit": true,
   "maxScore": 5
  }
 },
 {
  "_id": "b2000000-0000-4000-8000-000000000032",
  "questionSetId": "b2000000-0000-4000-8000-000000000032",
  "revision": 1,
  "schemaVersion": 1,
  "partId": "16000000-0000-4000-8000-000000000012",
  "taskTypeCode": "SENTENCE_ORDERING",
  "title": "Car park",
  "instructions": "Sắp xếp các câu theo thứ tự đúng để tạo thành một đoạn văn hoàn chỉnh.",
  "accessLevel": "PREMIUM",
  "stimulus": null,
  "sections": [],
  "items": [
   {
    "id": "item_1",
    "sequenceNo": 1,
    "prompt": null,
    "responseType": "ORDERING",
    "required": true,
    "maxScore": 5,
    "options": [
     {
      "id": "s1",
      "code": "A",
      "content": "Please display the ticket with this information in the window of your car."
     },
     {
      "id": "s2",
      "code": "B",
      "content": "When you arrive, please take a ticket from a machine at the entrance."
     },
     {
      "id": "s3",
      "code": "C",
      "content": "Before you leave, please put the ticket on the machine by the gate."
     },
     {
      "id": "s4",
      "code": "D",
      "content": "The machine will read your information and tell you how much you have to pay."
     },
     {
      "id": "s5",
      "code": "E",
      "content": "This ticket will show the date and the time you arrived."
     }
    ],
    "leftItems": [],
    "rightItems": [],
    "constraints": {
     "pointsPerCorrect": 1
    },
    "rubricCode": null,
    "answerKey": {
     "type": "ORDERING",
     "selectedOptionId": null,
     "selectedOptionIds": [],
     "matches": {},
     "orderedOptionIds": [
      "s2",
      "s5",
      "s1",
      "s3",
      "s4"
     ],
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
   "strategy": "EXACT_MATCH",
   "partialCredit": true,
   "maxScore": 5
  }
 },
 {
  "_id": "b2000000-0000-4000-8000-000000000033",
  "questionSetId": "b2000000-0000-4000-8000-000000000033",
  "revision": 1,
  "schemaVersion": 1,
  "partId": "16000000-0000-4000-8000-000000000012",
  "taskTypeCode": "SENTENCE_ORDERING",
  "title": "Participate in a race.",
  "instructions": "Sắp xếp các câu theo thứ tự đúng để tạo thành một đoạn văn hoàn chỉnh.",
  "accessLevel": "PREMIUM",
  "stimulus": null,
  "sections": [],
  "items": [
   {
    "id": "item_1",
    "sequenceNo": 1,
    "prompt": null,
    "responseType": "ORDERING",
    "required": true,
    "maxScore": 5,
    "options": [
     {
      "id": "s1",
      "code": "A",
      "content": "Runners must register here at least 30 minutes before the race starts at 9am."
     },
     {
      "id": "s2",
      "code": "B",
      "content": "A member of staff will give you a numbered armband to wear."
     },
     {
      "id": "s3",
      "code": "C",
      "content": "On your arrival, please go to the information point at the north gate."
     },
     {
      "id": "s4",
      "code": "D",
      "content": "Please put this on immediately and join other competitors at the warm-up area."
     },
     {
      "id": "s5",
      "code": "E",
      "content": "To do this, you just need to give us your photo card."
     }
    ],
    "leftItems": [],
    "rightItems": [],
    "constraints": {
     "pointsPerCorrect": 1
    },
    "rubricCode": null,
    "answerKey": {
     "type": "ORDERING",
     "selectedOptionId": null,
     "selectedOptionIds": [],
     "matches": {},
     "orderedOptionIds": [
      "s3",
      "s1",
      "s5",
      "s2",
      "s4"
     ],
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
   "strategy": "EXACT_MATCH",
   "partialCredit": true,
   "maxScore": 5
  }
 },
 {
  "_id": "b2000000-0000-4000-8000-000000000034",
  "questionSetId": "b2000000-0000-4000-8000-000000000034",
  "revision": 1,
  "schemaVersion": 1,
  "partId": "16000000-0000-4000-8000-000000000012",
  "taskTypeCode": "SENTENCE_ORDERING",
  "title": "fire instructions",
  "instructions": "Sắp xếp các câu theo thứ tự đúng để tạo thành một đoạn văn hoàn chỉnh.",
  "accessLevel": "PREMIUM",
  "stimulus": null,
  "sections": [],
  "items": [
   {
    "id": "item_1",
    "sequenceNo": 1,
    "prompt": null,
    "responseType": "ORDERING",
    "required": true,
    "maxScore": 5,
    "options": [
     {
      "id": "s1",
      "code": "A",
      "content": "Outside, gather on the grass and wait for further instructions."
     },
     {
      "id": "s2",
      "code": "B",
      "content": "When you reach the bottom of these stairs, leave the building through front entrance"
     },
     {
      "id": "s3",
      "code": "C",
      "content": "Next, walk calmly to the doors marked Emergency Exit"
     },
     {
      "id": "s4",
      "code": "D",
      "content": "Through these doors, there are stairs leading you to the ground floor"
     },
     {
      "id": "s5",
      "code": "E",
      "content": "When you hear the alarm, leave your bags and belongings at the desk"
     }
    ],
    "leftItems": [],
    "rightItems": [],
    "constraints": {
     "pointsPerCorrect": 1
    },
    "rubricCode": null,
    "answerKey": {
     "type": "ORDERING",
     "selectedOptionId": null,
     "selectedOptionIds": [],
     "matches": {},
     "orderedOptionIds": [
      "s5",
      "s3",
      "s4",
      "s2",
      "s1"
     ],
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
   "strategy": "EXACT_MATCH",
   "partialCredit": true,
   "maxScore": 5
  }
 },
 {
  "_id": "b2000000-0000-4000-8000-000000000035",
  "questionSetId": "b2000000-0000-4000-8000-000000000035",
  "revision": 1,
  "schemaVersion": 1,
  "partId": "16000000-0000-4000-8000-000000000012",
  "taskTypeCode": "SENTENCE_ORDERING",
  "title": "Quy trình nộp report",
  "instructions": "Sắp xếp các câu theo thứ tự đúng để tạo thành một đoạn văn hoàn chỉnh.",
  "accessLevel": "PREMIUM",
  "stimulus": null,
  "sections": [],
  "items": [
   {
    "id": "item_1",
    "sequenceNo": 1,
    "prompt": null,
    "responseType": "ORDERING",
    "required": true,
    "maxScore": 5,
    "options": [
     {
      "id": "s1",
      "code": "A",
      "content": "After you make the corrections, send your report by your email."
     },
     {
      "id": "s2",
      "code": "B",
      "content": "When you have finished your report, correct all the mistakes"
     },
     {
      "id": "s3",
      "code": "C",
      "content": "Before you start to write your report, you should look at websites for the information you need"
     },
     {
      "id": "s4",
      "code": "D",
      "content": "Remember to save links to websites and include them in your report"
     },
     {
      "id": "s5",
      "code": "E",
      "content": "You should also include a list of books that you use for reference"
     }
    ],
    "leftItems": [],
    "rightItems": [],
    "constraints": {
     "pointsPerCorrect": 1
    },
    "rubricCode": null,
    "answerKey": {
     "type": "ORDERING",
     "selectedOptionId": null,
     "selectedOptionIds": [],
     "matches": {},
     "orderedOptionIds": [
      "s3",
      "s4",
      "s5",
      "s2",
      "s1"
     ],
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
   "strategy": "EXACT_MATCH",
   "partialCredit": true,
   "maxScore": 5
  }
 },
 {
  "_id": "b2000000-0000-4000-8000-000000000036",
  "questionSetId": "b2000000-0000-4000-8000-000000000036",
  "revision": 1,
  "schemaVersion": 1,
  "partId": "16000000-0000-4000-8000-000000000012",
  "taskTypeCode": "SENTENCE_ORDERING",
  "title": "Quá trình dùng máy in printer",
  "instructions": "Sắp xếp các câu theo thứ tự đúng để tạo thành một đoạn văn hoàn chỉnh.",
  "accessLevel": "PREMIUM",
  "stimulus": null,
  "sections": [],
  "items": [
   {
    "id": "item_1",
    "sequenceNo": 1,
    "prompt": null,
    "responseType": "ORDERING",
    "required": true,
    "maxScore": 5,
    "options": [
     {
      "id": "s1",
      "code": "A",
      "content": "A light will come on at the front of the printer."
     },
     {
      "id": "s2",
      "code": "B",
      "content": "If the light is green, the printer has started correctly."
     },
     {
      "id": "s3",
      "code": "C",
      "content": "Before printing, you need to put paper into the printer."
     },
     {
      "id": "s4",
      "code": "D",
      "content": "First, you need to find an appropriate place to put your printer"
     },
     {
      "id": "s5",
      "code": "E",
      "content": "When your printer is in place, turn it on using the switch"
     }
    ],
    "leftItems": [],
    "rightItems": [],
    "constraints": {
     "pointsPerCorrect": 1
    },
    "rubricCode": null,
    "answerKey": {
     "type": "ORDERING",
     "selectedOptionId": null,
     "selectedOptionIds": [],
     "matches": {},
     "orderedOptionIds": [
      "s4",
      "s5",
      "s1",
      "s2",
      "s3"
     ],
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
   "strategy": "EXACT_MATCH",
   "partialCredit": true,
   "maxScore": 5
  }
 },
 {
  "_id": "b2000000-0000-4000-8000-000000000037",
  "questionSetId": "b2000000-0000-4000-8000-000000000037",
  "revision": 1,
  "schemaVersion": 1,
  "partId": "16000000-0000-4000-8000-000000000012",
  "taskTypeCode": "SENTENCE_ORDERING",
  "title": "Betty Barr's life",
  "instructions": "Sắp xếp các câu theo thứ tự đúng để tạo thành một đoạn văn hoàn chỉnh.",
  "accessLevel": "PREMIUM",
  "stimulus": null,
  "sections": [],
  "items": [
   {
    "id": "item_1",
    "sequenceNo": 1,
    "prompt": null,
    "responseType": "ORDERING",
    "required": true,
    "maxScore": 5,
    "options": [
     {
      "id": "s1",
      "code": "A",
      "content": "After she finished school, she went to Wellesley College, a famous university in the USA."
     },
     {
      "id": "s2",
      "code": "B",
      "content": "She was born in Shanghai in 1933 to an American mother and a father from Scotland."
     },
     {
      "id": "s3",
      "code": "C",
      "content": "However, she missed China and applied for a job in Hong Kong, where she taught from 1959 to 1972 and learnt to speak Cantonese, the local language."
     },
     {
      "id": "s4",
      "code": "D",
      "content": "In the 1980s, she finally returned to China and still lives with her Shanghai husband, George Wang."
     },
     {
      "id": "s5",
      "code": "E",
      "content": "At that time, Shanghai was a city filled with many people from different countries."
     }
    ],
    "leftItems": [],
    "rightItems": [],
    "constraints": {
     "pointsPerCorrect": 1
    },
    "rubricCode": null,
    "answerKey": {
     "type": "ORDERING",
     "selectedOptionId": null,
     "selectedOptionIds": [],
     "matches": {},
     "orderedOptionIds": [
      "s2",
      "s5",
      "s1",
      "s3",
      "s4"
     ],
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
   "strategy": "EXACT_MATCH",
   "partialCredit": true,
   "maxScore": 5
  }
 },
 {
  "_id": "b2000000-0000-4000-8000-000000000038",
  "questionSetId": "b2000000-0000-4000-8000-000000000038",
  "revision": 1,
  "schemaVersion": 1,
  "partId": "16000000-0000-4000-8000-000000000012",
  "taskTypeCode": "SENTENCE_ORDERING",
  "title": "Key card!",
  "instructions": "Sắp xếp các câu theo thứ tự đúng để tạo thành một đoạn văn hoàn chỉnh.",
  "accessLevel": "PREMIUM",
  "stimulus": null,
  "sections": [],
  "items": [
   {
    "id": "item_1",
    "sequenceNo": 1,
    "prompt": null,
    "responseType": "ORDERING",
    "required": true,
    "maxScore": 5,
    "options": [
     {
      "id": "s1",
      "code": "A",
      "content": "If you lose this, you will need to see the staff member at the front desk."
     },
     {
      "id": "s2",
      "code": "B",
      "content": "You will also need to show your identification card."
     },
     {
      "id": "s3",
      "code": "C",
      "content": "To enter the building and use the lift, you will need your key card."
     },
     {
      "id": "s4",
      "code": "D",
      "content": "He or she will make a copy of it and give you a new key card."
     },
     {
      "id": "s5",
      "code": "E",
      "content": "He or she will ask for your name and your flat number, and then will write these down."
     }
    ],
    "leftItems": [],
    "rightItems": [],
    "constraints": {
     "pointsPerCorrect": 1
    },
    "rubricCode": null,
    "answerKey": {
     "type": "ORDERING",
     "selectedOptionId": null,
     "selectedOptionIds": [],
     "matches": {},
     "orderedOptionIds": [
      "s3",
      "s1",
      "s5",
      "s2",
      "s4"
     ],
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
   "strategy": "EXACT_MATCH",
   "partialCredit": true,
   "maxScore": 5
  }
 },
 {
  "_id": "b2000000-0000-4000-8000-000000000039",
  "questionSetId": "b2000000-0000-4000-8000-000000000039",
  "revision": 1,
  "schemaVersion": 1,
  "partId": "16000000-0000-4000-8000-000000000012",
  "taskTypeCode": "SENTENCE_ORDERING",
  "title": "Diễn viên nổi tiếng Jay Mist",
  "instructions": "Sắp xếp các câu theo thứ tự đúng để tạo thành một đoạn văn hoàn chỉnh.",
  "accessLevel": "PREMIUM",
  "stimulus": null,
  "sections": [],
  "items": [
   {
    "id": "item_1",
    "sequenceNo": 1,
    "prompt": null,
    "responseType": "ORDERING",
    "required": true,
    "maxScore": 5,
    "options": [
     {
      "id": "s1",
      "code": "A",
      "content": "He started studying at a school in that country, and in his free time, he did strength exercises."
     },
     {
      "id": "s2",
      "code": "B",
      "content": "At one of these events, an acting agent saw him and gave him a starring role."
     },
     {
      "id": "s3",
      "code": "C",
      "content": "When Jay was a child, his parents left their home country and took him to live in the United States."
     },
     {
      "id": "s4",
      "code": "D",
      "content": "It was a major action movie, and he gained fame from that film."
     },
     {
      "id": "s5",
      "code": "E",
      "content": "Jay became very good at this and participated in a bodybuilding competition."
     }
    ],
    "leftItems": [],
    "rightItems": [],
    "constraints": {
     "pointsPerCorrect": 1
    },
    "rubricCode": null,
    "answerKey": {
     "type": "ORDERING",
     "selectedOptionId": null,
     "selectedOptionIds": [],
     "matches": {},
     "orderedOptionIds": [
      "s3",
      "s1",
      "s5",
      "s2",
      "s4"
     ],
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
   "strategy": "EXACT_MATCH",
   "partialCredit": true,
   "maxScore": 5
  }
 },
 {
  "_id": "b2000000-0000-4000-8000-000000000040",
  "questionSetId": "b2000000-0000-4000-8000-000000000040",
  "revision": 1,
  "schemaVersion": 1,
  "partId": "16000000-0000-4000-8000-000000000012",
  "taskTypeCode": "SENTENCE_ORDERING",
  "title": "Quy trình trồng khoai",
  "instructions": "Sắp xếp các câu theo thứ tự đúng để tạo thành một đoạn văn hoàn chỉnh.",
  "accessLevel": "PREMIUM",
  "stimulus": null,
  "sections": [],
  "items": [
   {
    "id": "item_1",
    "sequenceNo": 1,
    "prompt": null,
    "responseType": "ORDERING",
    "required": true,
    "maxScore": 5,
    "options": [
     {
      "id": "s1",
      "code": "A",
      "content": "All you need is some earth, an old potato, and a big pot."
     },
     {
      "id": "s2",
      "code": "B",
      "content": "This color means it is perfect for growing, you should put some earth in the pot and dig it deep down."
     },
     {
      "id": "s3",
      "code": "C",
      "content": "With this care, you should see a potato plant growing after a couple of weeks."
     },
     {
      "id": "s4",
      "code": "D",
      "content": "An old potato will have little roots, will be a little green, and won't be good for eating."
     },
     {
      "id": "s5",
      "code": "E",
      "content": "When you've done this, you should water it every day and place it in a sunny spot."
     }
    ],
    "leftItems": [],
    "rightItems": [],
    "constraints": {
     "pointsPerCorrect": 1
    },
    "rubricCode": null,
    "answerKey": {
     "type": "ORDERING",
     "selectedOptionId": null,
     "selectedOptionIds": [],
     "matches": {},
     "orderedOptionIds": [
      "s1",
      "s4",
      "s2",
      "s5",
      "s3"
     ],
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
   "strategy": "EXACT_MATCH",
   "partialCredit": true,
   "maxScore": 5
  }
 },
 {
  "_id": "b2000000-0000-4000-8000-000000000042",
  "questionSetId": "b2000000-0000-4000-8000-000000000042",
  "revision": 1,
  "schemaVersion": 1,
  "partId": "16000000-0000-4000-8000-000000000012",
  "taskTypeCode": "SENTENCE_ORDERING",
  "title": "Using public cycle",
  "instructions": "Sắp xếp các câu theo thứ tự đúng để tạo thành một đoạn văn hoàn chỉnh.",
  "accessLevel": "PREMIUM",
  "stimulus": null,
  "sections": [],
  "items": [
   {
    "id": "item_1",
    "sequenceNo": 1,
    "prompt": null,
    "responseType": "ORDERING",
    "required": true,
    "maxScore": 5,
    "options": [
     {
      "id": "s1",
      "code": "A",
      "content": "Choose \"hire the cycle\" on the screen and then follow the instructions to receive an unlock code."
     },
     {
      "id": "s2",
      "code": "B",
      "content": "When the green light appears, you can unlock your bike and start your journey."
     },
     {
      "id": "s3",
      "code": "C",
      "content": "Go to the collection point and use your bank card on the screen."
     },
     {
      "id": "s4",
      "code": "D",
      "content": "When you finish your journey, return the bike to any empty collection point."
     },
     {
      "id": "s5",
      "code": "E",
      "content": "Enter the code on the lock of the bike and wait for the green lights."
     }
    ],
    "leftItems": [],
    "rightItems": [],
    "constraints": {
     "pointsPerCorrect": 1
    },
    "rubricCode": null,
    "answerKey": {
     "type": "ORDERING",
     "selectedOptionId": null,
     "selectedOptionIds": [],
     "matches": {},
     "orderedOptionIds": [
      "s3",
      "s1",
      "s5",
      "s2",
      "s4"
     ],
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
   "strategy": "EXACT_MATCH",
   "partialCredit": true,
   "maxScore": 5
  }
 },
 {
  "_id": "b2000000-0000-4000-8000-000000000043",
  "questionSetId": "b2000000-0000-4000-8000-000000000043",
  "revision": 1,
  "schemaVersion": 1,
  "partId": "16000000-0000-4000-8000-000000000012",
  "taskTypeCode": "SENTENCE_ORDERING",
  "title": "Quy trình vào animal hospital",
  "instructions": "Sắp xếp các câu theo thứ tự đúng để tạo thành một đoạn văn hoàn chỉnh.",
  "accessLevel": "PREMIUM",
  "stimulus": null,
  "sections": [],
  "items": [
   {
    "id": "item_1",
    "sequenceNo": 1,
    "prompt": null,
    "responseType": "ORDERING",
    "required": true,
    "maxScore": 5,
    "options": [
     {
      "id": "s1",
      "code": "A",
      "content": "You will need to show this ticket to a member of staff at the door before you enter."
     },
     {
      "id": "s2",
      "code": "B",
      "content": "Before you look at the pictures, a guide will tell you about the day's animal-care event."
     },
     {
      "id": "s3",
      "code": "C",
      "content": "Later, the animal-care activities will include playing with and feeding the animals."
     },
     {
      "id": "s4",
      "code": "D",
      "content": "Inside the building, you will find a photography exhibition on the ground floor"
     },
     {
      "id": "s5",
      "code": "E",
      "content": "When you arrive, go straight to the main office to collect your ticket"
     }
    ],
    "leftItems": [],
    "rightItems": [],
    "constraints": {
     "pointsPerCorrect": 1
    },
    "rubricCode": null,
    "answerKey": {
     "type": "ORDERING",
     "selectedOptionId": null,
     "selectedOptionIds": [],
     "matches": {},
     "orderedOptionIds": [
      "s5",
      "s1",
      "s4",
      "s2",
      "s3"
     ],
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
   "strategy": "EXACT_MATCH",
   "partialCredit": true,
   "maxScore": 5
  }
 },
 {
  "_id": "b2000000-0000-4000-8000-000000000044",
  "questionSetId": "b2000000-0000-4000-8000-000000000044",
  "revision": 1,
  "schemaVersion": 1,
  "partId": "16000000-0000-4000-8000-000000000012",
  "taskTypeCode": "SENTENCE_ORDERING",
  "title": "A famous football player",
  "instructions": "Sắp xếp các câu theo thứ tự đúng để tạo thành một đoạn văn hoàn chỉnh.",
  "accessLevel": "PREMIUM",
  "stimulus": null,
  "sections": [],
  "items": [
   {
    "id": "item_1",
    "sequenceNo": 1,
    "prompt": null,
    "responseType": "ORDERING",
    "required": true,
    "maxScore": 5,
    "options": [
     {
      "id": "s1",
      "code": "A",
      "content": "After that, he moved to Italy and Spain, where he finished his playing career"
     },
     {
      "id": "s2",
      "code": "B",
      "content": "Since he retired from playing, he has worked as a football club manager."
     },
     {
      "id": "s3",
      "code": "C",
      "content": "He then moved away from his home to join Cannes Football Club in the southern France"
     },
     {
      "id": "s4",
      "code": "D",
      "content": "While he was at that club, people throughout France saw that he was a brilliant player."
     },
     {
      "id": "s5",
      "code": "E",
      "content": "When he was a child, he played for some local teams near his home in Marseille"
     }
    ],
    "leftItems": [],
    "rightItems": [],
    "constraints": {
     "pointsPerCorrect": 1
    },
    "rubricCode": null,
    "answerKey": {
     "type": "ORDERING",
     "selectedOptionId": null,
     "selectedOptionIds": [],
     "matches": {},
     "orderedOptionIds": [
      "s5",
      "s3",
      "s4",
      "s1",
      "s2"
     ],
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
   "strategy": "EXACT_MATCH",
   "partialCredit": true,
   "maxScore": 5
  }
 },
 {
  "_id": "b2000000-0000-4000-8000-000000000045",
  "questionSetId": "b2000000-0000-4000-8000-000000000045",
  "revision": 1,
  "schemaVersion": 1,
  "partId": "16000000-0000-4000-8000-000000000012",
  "taskTypeCode": "SENTENCE_ORDERING",
  "title": "Public Transportation",
  "instructions": "Sắp xếp các câu theo thứ tự đúng để tạo thành một đoạn văn hoàn chỉnh.",
  "accessLevel": "PREMIUM",
  "stimulus": null,
  "sections": [],
  "items": [
   {
    "id": "item_1",
    "sequenceNo": 1,
    "prompt": null,
    "responseType": "ORDERING",
    "required": true,
    "maxScore": 5,
    "options": [
     {
      "id": "s1",
      "code": "A",
      "content": "In addition to these technical improvements, drivers and staff now receive better training to provide improved passenger service."
     },
     {
      "id": "s2",
      "code": "B",
      "content": "City buses today are much more efficient than those from ten years ago."
     },
     {
      "id": "s3",
      "code": "C",
      "content": "In the past, many cities had fewer bus routes because of budget limitations."
     },
     {
      "id": "s4",
      "code": "D",
      "content": "Modern buses often use electric power, helping to reduce pollution in urban areas."
     },
     {
      "id": "s5",
      "code": "E",
      "content": "Older buses often did not have air conditioning or comfortable seating."
     }
    ],
    "leftItems": [],
    "rightItems": [],
    "constraints": {
     "pointsPerCorrect": 1
    },
    "rubricCode": null,
    "answerKey": {
     "type": "ORDERING",
     "selectedOptionId": null,
     "selectedOptionIds": [],
     "matches": {},
     "orderedOptionIds": [
      "s3",
      "s5",
      "s2",
      "s4",
      "s1"
     ],
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
   "strategy": "EXACT_MATCH",
   "partialCredit": true,
   "maxScore": 5
  }
 },
 {
  "_id": "b2000000-0000-4000-8000-000000000046",
  "questionSetId": "b2000000-0000-4000-8000-000000000046",
  "revision": 1,
  "schemaVersion": 1,
  "partId": "16000000-0000-4000-8000-000000000012",
  "taskTypeCode": "SENTENCE_ORDERING",
  "title": "Natural history centre",
  "instructions": "Sắp xếp các câu theo thứ tự đúng để tạo thành một đoạn văn hoàn chỉnh.",
  "accessLevel": "PREMIUM",
  "stimulus": null,
  "sections": [],
  "items": [
   {
    "id": "item_1",
    "sequenceNo": 1,
    "prompt": null,
    "responseType": "ORDERING",
    "required": true,
    "maxScore": 5,
    "options": [
     {
      "id": "s1",
      "code": "A",
      "content": "The ticket office is at the top of these stairs, and the staff there are very helpful."
     },
     {
      "id": "s2",
      "code": "B",
      "content": "The entrance of the centre is on the town's main square."
     },
     {
      "id": "s3",
      "code": "C",
      "content": "As well as selling tickets, they can provide maps and useful tour information."
     },
     {
      "id": "s4",
      "code": "D",
      "content": "There are many interesting places to visit in the town, and the most important one is the Natural History Centre."
     },
     {
      "id": "s5",
      "code": "E",
      "content": "When you enter the building from the square, you will see a set of stairs to your left."
     }
    ],
    "leftItems": [],
    "rightItems": [],
    "constraints": {
     "pointsPerCorrect": 1
    },
    "rubricCode": null,
    "answerKey": {
     "type": "ORDERING",
     "selectedOptionId": null,
     "selectedOptionIds": [],
     "matches": {},
     "orderedOptionIds": [
      "s4",
      "s2",
      "s5",
      "s1",
      "s3"
     ],
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
   "strategy": "EXACT_MATCH",
   "partialCredit": true,
   "maxScore": 5
  }
 },
 {
  "_id": "b2000000-0000-4000-8000-000000000055",
  "questionSetId": "b2000000-0000-4000-8000-000000000055",
  "revision": 1,
  "schemaVersion": 1,
  "partId": "16000000-0000-4000-8000-000000000012",
  "taskTypeCode": "SENTENCE_ORDERING",
  "title": "Writing about a place (Version 2)",
  "instructions": "Sắp xếp các câu theo thứ tự đúng để tạo thành một đoạn văn hoàn chỉnh.",
  "accessLevel": "PREMIUM",
  "stimulus": null,
  "sections": [],
  "items": [
   {
    "id": "item_1",
    "sequenceNo": 1,
    "prompt": null,
    "responseType": "ORDERING",
    "required": true,
    "maxScore": 5,
    "options": [
     {
      "id": "s1",
      "code": "A",
      "content": "You may not find all the above information but you will find places with similarities."
     },
     {
      "id": "s2",
      "code": "B",
      "content": "This comparison will help you find common points between countries."
     },
     {
      "id": "s3",
      "code": "C",
      "content": "Before writing, we need to find out some information about the place."
     },
     {
      "id": "s4",
      "code": "D",
      "content": "When collecting information about the above 3 aspects, you can compare with places in your country."
     },
     {
      "id": "s5",
      "code": "E",
      "content": "That information can revolve around the aspects: people, culture and history."
     }
    ],
    "leftItems": [],
    "rightItems": [],
    "constraints": {
     "pointsPerCorrect": 1
    },
    "rubricCode": null,
    "answerKey": {
     "type": "ORDERING",
     "selectedOptionId": null,
     "selectedOptionIds": [],
     "matches": {},
     "orderedOptionIds": [
      "s3",
      "s5",
      "s1",
      "s4",
      "s2"
     ],
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
   "strategy": "EXACT_MATCH",
   "partialCredit": true,
   "maxScore": 5
  }
 },
 {
  "_id": "b2000000-0000-4000-8000-000000000062",
  "questionSetId": "b2000000-0000-4000-8000-000000000062",
  "revision": 1,
  "schemaVersion": 1,
  "partId": "16000000-0000-4000-8000-000000000012",
  "taskTypeCode": "SENTENCE_ORDERING",
  "title": "Travel",
  "instructions": "Sắp xếp các câu theo thứ tự đúng để tạo thành một đoạn văn hoàn chỉnh.",
  "accessLevel": "PREMIUM",
  "stimulus": null,
  "sections": [],
  "items": [
   {
    "id": "item_1",
    "sequenceNo": 1,
    "prompt": null,
    "responseType": "ORDERING",
    "required": true,
    "maxScore": 5,
    "options": [
     {
      "id": "s1",
      "code": "A",
      "content": "Thanks to the invention of cars and trains, it became easier for people to travel"
     },
     {
      "id": "s2",
      "code": "B",
      "content": "At that time, only the very wealthy could afford to travel"
     },
     {
      "id": "s3",
      "code": "C",
      "content": "Thanks to the great development of means of transport, today people can travel to other parts of the world."
     },
     {
      "id": "s4",
      "code": "D",
      "content": "Because flying is very fast, people can travel by this means to different locations for business or travel"
     },
     {
      "id": "s5",
      "code": "E",
      "content": "Not only the above 2 means of transport, people later had the opportunity to travel by aeroplanes"
     }
    ],
    "leftItems": [],
    "rightItems": [],
    "constraints": {
     "pointsPerCorrect": 1
    },
    "rubricCode": null,
    "answerKey": {
     "type": "ORDERING",
     "selectedOptionId": null,
     "selectedOptionIds": [],
     "matches": {},
     "orderedOptionIds": [
      "s2",
      "s1",
      "s5",
      "s4",
      "s3"
     ],
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
   "strategy": "EXACT_MATCH",
   "partialCredit": true,
   "maxScore": 5
  }
 },
 {
  "_id": "b2000000-0000-4000-8000-000000000063",
  "questionSetId": "b2000000-0000-4000-8000-000000000063",
  "revision": 1,
  "schemaVersion": 1,
  "partId": "16000000-0000-4000-8000-000000000012",
  "taskTypeCode": "SENTENCE_ORDERING",
  "title": "My visit to a new coffee shop (Version 2)",
  "instructions": "Sắp xếp các câu theo thứ tự đúng để tạo thành một đoạn văn hoàn chỉnh.",
  "accessLevel": "PREMIUM",
  "stimulus": null,
  "sections": [],
  "items": [
   {
    "id": "item_1",
    "sequenceNo": 1,
    "prompt": null,
    "responseType": "ORDERING",
    "required": true,
    "maxScore": 5,
    "options": [
     {
      "id": "s1",
      "code": "A",
      "content": "Although it was busy the staff still arranged a table for me"
     },
     {
      "id": "s2",
      "code": "B",
      "content": "I looked at all of those and chose the most expensive sandwich."
     },
     {
      "id": "s3",
      "code": "C",
      "content": "When I was there it was very crowded and the staff were very busy on the first day"
     },
     {
      "id": "s4",
      "code": "D",
      "content": "It tasted quite good with cheese toppings and I will definitely go back to this place"
     },
     {
      "id": "s5",
      "code": "E",
      "content": "They gave me the menu and when I looked at it I felt disappointed because I saw quite a few dishes"
     }
    ],
    "leftItems": [],
    "rightItems": [],
    "constraints": {
     "pointsPerCorrect": 1
    },
    "rubricCode": null,
    "answerKey": {
     "type": "ORDERING",
     "selectedOptionId": null,
     "selectedOptionIds": [],
     "matches": {},
     "orderedOptionIds": [
      "s3",
      "s1",
      "s5",
      "s2",
      "s4"
     ],
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
   "strategy": "EXACT_MATCH",
   "partialCredit": true,
   "maxScore": 5
  }
 }
];

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
print('Da upsert ' + n + ' de Reading Part 2');
print('Tong de Part 2 trong Mongo = ' +
  target.question_set_documents.countDocuments({ partId: '16000000-0000-4000-8000-000000000012' }));
