// SINH TỰ ĐỘNG bằng: node scripts/gen-reading-part1-bank.js
// Đừng sửa tay file này — sửa nguồn JSON rồi chạy lại lệnh trên.
const target = db.getSiblingDB('aptis');
const DOCS = [
 {
  "_id": "b1000000-0000-4000-8000-000000000001",
  "questionSetId": "b1000000-0000-4000-8000-000000000001",
  "revision": 1,
  "schemaVersion": 1,
  "partId": "16000000-0000-4000-8000-000000000011",
  "taskTypeCode": "GAP_FILL_CHOICE",
  "title": "Take the bus to the main ______.",
  "instructions": "Chọn từ phù hợp để hoàn thành câu.",
  "accessLevel": "PREMIUM",
  "stimulus": null,
  "sections": [],
  "items": [
   {
    "id": "item_1",
    "sequenceNo": 1,
    "prompt": {
     "format": "PLAIN_TEXT",
     "value": "Take the bus to the main ______."
    },
    "responseType": "SINGLE_CHOICE",
    "required": true,
    "maxScore": 2,
    "options": [
     {
      "id": "A",
      "code": "A",
      "content": "station"
     },
     {
      "id": "B",
      "code": "B",
      "content": "run"
     },
     {
      "id": "C",
      "code": "C",
      "content": "walk"
     }
    ],
    "leftItems": [],
    "rightItems": [],
    "constraints": {},
    "answerKey": {
     "type": "SINGLE_CHOICE",
     "selectedOptionId": "A",
     "selectedOptionIds": [],
     "matches": {},
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
   "strategy": "EXACT_MATCH",
   "partialCredit": false,
   "maxScore": 2
  }
 },
 {
  "_id": "b1000000-0000-4000-8000-000000000002",
  "questionSetId": "b1000000-0000-4000-8000-000000000002",
  "revision": 1,
  "schemaVersion": 1,
  "partId": "16000000-0000-4000-8000-000000000011",
  "taskTypeCode": "GAP_FILL_CHOICE",
  "title": "I saw some shoes in the ______ of one store.",
  "instructions": "Chọn từ phù hợp để hoàn thành câu.",
  "accessLevel": "PREMIUM",
  "stimulus": null,
  "sections": [],
  "items": [
   {
    "id": "item_1",
    "sequenceNo": 1,
    "prompt": {
     "format": "PLAIN_TEXT",
     "value": "I saw some shoes in the ______ of one store."
    },
    "responseType": "SINGLE_CHOICE",
    "required": true,
    "maxScore": 2,
    "options": [
     {
      "id": "A",
      "code": "A",
      "content": "market"
     },
     {
      "id": "B",
      "code": "B",
      "content": "window"
     },
     {
      "id": "C",
      "code": "C",
      "content": "shoe"
     }
    ],
    "leftItems": [],
    "rightItems": [],
    "constraints": {},
    "answerKey": {
     "type": "SINGLE_CHOICE",
     "selectedOptionId": "B",
     "selectedOptionIds": [],
     "matches": {},
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
   "strategy": "EXACT_MATCH",
   "partialCredit": false,
   "maxScore": 2
  }
 },
 {
  "_id": "b1000000-0000-4000-8000-000000000003",
  "questionSetId": "b1000000-0000-4000-8000-000000000003",
  "revision": 1,
  "schemaVersion": 1,
  "partId": "16000000-0000-4000-8000-000000000011",
  "taskTypeCode": "GAP_FILL_CHOICE",
  "title": "I get up early in the ____ and I go running.",
  "instructions": "Chọn từ phù hợp để hoàn thành câu.",
  "accessLevel": "PREMIUM",
  "stimulus": null,
  "sections": [],
  "items": [
   {
    "id": "item_1",
    "sequenceNo": 1,
    "prompt": {
     "format": "PLAIN_TEXT",
     "value": "I get up early in the ____ and I go running."
    },
    "responseType": "SINGLE_CHOICE",
    "required": true,
    "maxScore": 2,
    "options": [
     {
      "id": "A",
      "code": "A",
      "content": "morning"
     },
     {
      "id": "B",
      "code": "B",
      "content": "friends"
     },
     {
      "id": "C",
      "code": "C",
      "content": "leave"
     }
    ],
    "leftItems": [],
    "rightItems": [],
    "constraints": {},
    "answerKey": {
     "type": "SINGLE_CHOICE",
     "selectedOptionId": "A",
     "selectedOptionIds": [],
     "matches": {},
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
   "strategy": "EXACT_MATCH",
   "partialCredit": false,
   "maxScore": 2
  }
 },
 {
  "_id": "b1000000-0000-4000-8000-000000000004",
  "questionSetId": "b1000000-0000-4000-8000-000000000004",
  "revision": 1,
  "schemaVersion": 1,
  "partId": "16000000-0000-4000-8000-000000000011",
  "taskTypeCode": "GAP_FILL_CHOICE",
  "title": "Everyone is ______.",
  "instructions": "Chọn từ phù hợp để hoàn thành câu.",
  "accessLevel": "PREMIUM",
  "stimulus": null,
  "sections": [],
  "items": [
   {
    "id": "item_1",
    "sequenceNo": 1,
    "prompt": {
     "format": "PLAIN_TEXT",
     "value": "Everyone is ______."
    },
    "responseType": "SINGLE_CHOICE",
    "required": true,
    "maxScore": 2,
    "options": [
     {
      "id": "A",
      "code": "A",
      "content": "friendly"
     },
     {
      "id": "B",
      "code": "B",
      "content": "melty"
     },
     {
      "id": "C",
      "code": "C",
      "content": "noisy"
     }
    ],
    "leftItems": [],
    "rightItems": [],
    "constraints": {},
    "answerKey": {
     "type": "SINGLE_CHOICE",
     "selectedOptionId": "A",
     "selectedOptionIds": [],
     "matches": {},
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
   "strategy": "EXACT_MATCH",
   "partialCredit": false,
   "maxScore": 2
  }
 },
 {
  "_id": "b1000000-0000-4000-8000-000000000005",
  "questionSetId": "b1000000-0000-4000-8000-000000000005",
  "revision": 1,
  "schemaVersion": 1,
  "partId": "16000000-0000-4000-8000-000000000011",
  "taskTypeCode": "GAP_FILL_CHOICE",
  "title": "I start ______ in the morning.",
  "instructions": "Chọn từ phù hợp để hoàn thành câu.",
  "accessLevel": "PREMIUM",
  "stimulus": null,
  "sections": [],
  "items": [
   {
    "id": "item_1",
    "sequenceNo": 1,
    "prompt": {
     "format": "PLAIN_TEXT",
     "value": "I start ______ in the morning."
    },
    "responseType": "SINGLE_CHOICE",
    "required": true,
    "maxScore": 2,
    "options": [
     {
      "id": "A",
      "code": "A",
      "content": "sleep"
     },
     {
      "id": "B",
      "code": "B",
      "content": "early"
     },
     {
      "id": "C",
      "code": "C",
      "content": "angry"
     }
    ],
    "leftItems": [],
    "rightItems": [],
    "constraints": {},
    "answerKey": {
     "type": "SINGLE_CHOICE",
     "selectedOptionId": "B",
     "selectedOptionIds": [],
     "matches": {},
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
   "strategy": "EXACT_MATCH",
   "partialCredit": false,
   "maxScore": 2
  }
 },
 {
  "_id": "b1000000-0000-4000-8000-000000000006",
  "questionSetId": "b1000000-0000-4000-8000-000000000006",
  "revision": 1,
  "schemaVersion": 1,
  "partId": "16000000-0000-4000-8000-000000000011",
  "taskTypeCode": "GAP_FILL_CHOICE",
  "title": "The ______ is out.",
  "instructions": "Chọn từ phù hợp để hoàn thành câu.",
  "accessLevel": "PREMIUM",
  "stimulus": null,
  "sections": [],
  "items": [
   {
    "id": "item_1",
    "sequenceNo": 1,
    "prompt": {
     "format": "PLAIN_TEXT",
     "value": "The ______ is out."
    },
    "responseType": "SINGLE_CHOICE",
    "required": true,
    "maxScore": 2,
    "options": [
     {
      "id": "A",
      "code": "A",
      "content": "wind"
     },
     {
      "id": "B",
      "code": "B",
      "content": "dust"
     },
     {
      "id": "C",
      "code": "C",
      "content": "sun"
     }
    ],
    "leftItems": [],
    "rightItems": [],
    "constraints": {},
    "answerKey": {
     "type": "SINGLE_CHOICE",
     "selectedOptionId": "C",
     "selectedOptionIds": [],
     "matches": {},
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
   "strategy": "EXACT_MATCH",
   "partialCredit": false,
   "maxScore": 2
  }
 },
 {
  "_id": "b1000000-0000-4000-8000-000000000007",
  "questionSetId": "b1000000-0000-4000-8000-000000000007",
  "revision": 1,
  "schemaVersion": 1,
  "partId": "16000000-0000-4000-8000-000000000011",
  "taskTypeCode": "GAP_FILL_CHOICE",
  "title": "I just reviewed the latest report, but the budget doesn't ____.",
  "instructions": "Chọn từ phù hợp để hoàn thành câu.",
  "accessLevel": "PREMIUM",
  "stimulus": null,
  "sections": [],
  "items": [
   {
    "id": "item_1",
    "sequenceNo": 1,
    "prompt": {
     "format": "PLAIN_TEXT",
     "value": "I just reviewed the latest report, but the budget doesn't ____."
    },
    "responseType": "SINGLE_CHOICE",
    "required": true,
    "maxScore": 2,
    "options": [
     {
      "id": "A",
      "code": "A",
      "content": "work"
     },
     {
      "id": "B",
      "code": "B",
      "content": "count"
     },
     {
      "id": "C",
      "code": "C",
      "content": "balance"
     }
    ],
    "leftItems": [],
    "rightItems": [],
    "constraints": {},
    "answerKey": {
     "type": "SINGLE_CHOICE",
     "selectedOptionId": "C",
     "selectedOptionIds": [],
     "matches": {},
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
   "strategy": "EXACT_MATCH",
   "partialCredit": false,
   "maxScore": 2
  }
 },
 {
  "_id": "b1000000-0000-4000-8000-000000000008",
  "questionSetId": "b1000000-0000-4000-8000-000000000008",
  "revision": 1,
  "schemaVersion": 1,
  "partId": "16000000-0000-4000-8000-000000000011",
  "taskTypeCode": "GAP_FILL_CHOICE",
  "title": "In the mornings, I attend ______.",
  "instructions": "Chọn từ phù hợp để hoàn thành câu.",
  "accessLevel": "PREMIUM",
  "stimulus": null,
  "sections": [],
  "items": [
   {
    "id": "item_1",
    "sequenceNo": 1,
    "prompt": {
     "format": "PLAIN_TEXT",
     "value": "In the mornings, I attend ______."
    },
    "responseType": "SINGLE_CHOICE",
    "required": true,
    "maxScore": 2,
    "options": [
     {
      "id": "A",
      "code": "A",
      "content": "meetings"
     },
     {
      "id": "B",
      "code": "B",
      "content": "dinner"
     },
     {
      "id": "C",
      "code": "C",
      "content": "breakfast"
     }
    ],
    "leftItems": [],
    "rightItems": [],
    "constraints": {},
    "answerKey": {
     "type": "SINGLE_CHOICE",
     "selectedOptionId": "A",
     "selectedOptionIds": [],
     "matches": {},
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
   "strategy": "EXACT_MATCH",
   "partialCredit": false,
   "maxScore": 2
  }
 },
 {
  "_id": "b1000000-0000-4000-8000-000000000009",
  "questionSetId": "b1000000-0000-4000-8000-000000000009",
  "revision": 1,
  "schemaVersion": 1,
  "partId": "16000000-0000-4000-8000-000000000011",
  "taskTypeCode": "GAP_FILL_CHOICE",
  "title": "The weather is ______.",
  "instructions": "Chọn từ phù hợp để hoàn thành câu.",
  "accessLevel": "PREMIUM",
  "stimulus": null,
  "sections": [],
  "items": [
   {
    "id": "item_1",
    "sequenceNo": 1,
    "prompt": {
     "format": "PLAIN_TEXT",
     "value": "The weather is ______."
    },
    "responseType": "SINGLE_CHOICE",
    "required": true,
    "maxScore": 2,
    "options": [
     {
      "id": "A",
      "code": "A",
      "content": "cheap"
     },
     {
      "id": "B",
      "code": "B",
      "content": "expensive"
     },
     {
      "id": "C",
      "code": "C",
      "content": "great"
     }
    ],
    "leftItems": [],
    "rightItems": [],
    "constraints": {},
    "answerKey": {
     "type": "SINGLE_CHOICE",
     "selectedOptionId": "C",
     "selectedOptionIds": [],
     "matches": {},
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
   "strategy": "EXACT_MATCH",
   "partialCredit": false,
   "maxScore": 2
  }
 },
 {
  "_id": "b1000000-0000-4000-8000-000000000010",
  "questionSetId": "b1000000-0000-4000-8000-000000000010",
  "revision": 1,
  "schemaVersion": 1,
  "partId": "16000000-0000-4000-8000-000000000011",
  "taskTypeCode": "GAP_FILL_CHOICE",
  "title": "I need the ______ of the report.",
  "instructions": "Chọn từ phù hợp để hoàn thành câu.",
  "accessLevel": "PREMIUM",
  "stimulus": null,
  "sections": [],
  "items": [
   {
    "id": "item_1",
    "sequenceNo": 1,
    "prompt": {
     "format": "PLAIN_TEXT",
     "value": "I need the ______ of the report."
    },
    "responseType": "SINGLE_CHOICE",
    "required": true,
    "maxScore": 2,
    "options": [
     {
      "id": "A",
      "code": "A",
      "content": "work"
     },
     {
      "id": "B",
      "code": "B",
      "content": "job"
     },
     {
      "id": "C",
      "code": "C",
      "content": "details"
     }
    ],
    "leftItems": [],
    "rightItems": [],
    "constraints": {},
    "answerKey": {
     "type": "SINGLE_CHOICE",
     "selectedOptionId": "C",
     "selectedOptionIds": [],
     "matches": {},
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
   "strategy": "EXACT_MATCH",
   "partialCredit": false,
   "maxScore": 2
  }
 },
 {
  "_id": "b1000000-0000-4000-8000-000000000011",
  "questionSetId": "b1000000-0000-4000-8000-000000000011",
  "revision": 1,
  "schemaVersion": 1,
  "partId": "16000000-0000-4000-8000-000000000011",
  "taskTypeCode": "GAP_FILL_CHOICE",
  "title": "I ______ in a flat.",
  "instructions": "Chọn từ phù hợp để hoàn thành câu.",
  "accessLevel": "PREMIUM",
  "stimulus": null,
  "sections": [],
  "items": [
   {
    "id": "item_1",
    "sequenceNo": 1,
    "prompt": {
     "format": "PLAIN_TEXT",
     "value": "I ______ in a flat."
    },
    "responseType": "SINGLE_CHOICE",
    "required": true,
    "maxScore": 2,
    "options": [
     {
      "id": "A",
      "code": "A",
      "content": "go"
     },
     {
      "id": "B",
      "code": "B",
      "content": "live"
     },
     {
      "id": "C",
      "code": "C",
      "content": "walk"
     }
    ],
    "leftItems": [],
    "rightItems": [],
    "constraints": {},
    "answerKey": {
     "type": "SINGLE_CHOICE",
     "selectedOptionId": "B",
     "selectedOptionIds": [],
     "matches": {},
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
   "strategy": "EXACT_MATCH",
   "partialCredit": false,
   "maxScore": 2
  }
 },
 {
  "_id": "b1000000-0000-4000-8000-000000000012",
  "questionSetId": "b1000000-0000-4000-8000-000000000012",
  "revision": 1,
  "schemaVersion": 1,
  "partId": "16000000-0000-4000-8000-000000000011",
  "taskTypeCode": "GAP_FILL_CHOICE",
  "title": "I am living with a family ______ the city.",
  "instructions": "Chọn từ phù hợp để hoàn thành câu.",
  "accessLevel": "PREMIUM",
  "stimulus": null,
  "sections": [],
  "items": [
   {
    "id": "item_1",
    "sequenceNo": 1,
    "prompt": {
     "format": "PLAIN_TEXT",
     "value": "I am living with a family ______ the city."
    },
    "responseType": "SINGLE_CHOICE",
    "required": true,
    "maxScore": 2,
    "options": [
     {
      "id": "A",
      "code": "A",
      "content": "next"
     },
     {
      "id": "B",
      "code": "B",
      "content": "near"
     },
     {
      "id": "C",
      "code": "C",
      "content": "under"
     }
    ],
    "leftItems": [],
    "rightItems": [],
    "constraints": {},
    "answerKey": {
     "type": "SINGLE_CHOICE",
     "selectedOptionId": "B",
     "selectedOptionIds": [],
     "matches": {},
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
   "strategy": "EXACT_MATCH",
   "partialCredit": false,
   "maxScore": 2
  }
 },
 {
  "_id": "b1000000-0000-4000-8000-000000000013",
  "questionSetId": "b1000000-0000-4000-8000-000000000013",
  "revision": 1,
  "schemaVersion": 1,
  "partId": "16000000-0000-4000-8000-000000000011",
  "taskTypeCode": "GAP_FILL_CHOICE",
  "title": "The water is ______.",
  "instructions": "Chọn từ phù hợp để hoàn thành câu.",
  "accessLevel": "PREMIUM",
  "stimulus": null,
  "sections": [],
  "items": [
   {
    "id": "item_1",
    "sequenceNo": 1,
    "prompt": {
     "format": "PLAIN_TEXT",
     "value": "The water is ______."
    },
    "responseType": "SINGLE_CHOICE",
    "required": true,
    "maxScore": 2,
    "options": [
     {
      "id": "A",
      "code": "A",
      "content": "sour"
     },
     {
      "id": "B",
      "code": "B",
      "content": "clear"
     },
     {
      "id": "C",
      "code": "C",
      "content": "see"
     }
    ],
    "leftItems": [],
    "rightItems": [],
    "constraints": {},
    "answerKey": {
     "type": "SINGLE_CHOICE",
     "selectedOptionId": "B",
     "selectedOptionIds": [],
     "matches": {},
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
   "strategy": "EXACT_MATCH",
   "partialCredit": false,
   "maxScore": 2
  }
 },
 {
  "_id": "b1000000-0000-4000-8000-000000000014",
  "questionSetId": "b1000000-0000-4000-8000-000000000014",
  "revision": 1,
  "schemaVersion": 1,
  "partId": "16000000-0000-4000-8000-000000000011",
  "taskTypeCode": "GAP_FILL_CHOICE",
  "title": "It is ______ what I like.",
  "instructions": "Chọn từ phù hợp để hoàn thành câu.",
  "accessLevel": "PREMIUM",
  "stimulus": null,
  "sections": [],
  "items": [
   {
    "id": "item_1",
    "sequenceNo": 1,
    "prompt": {
     "format": "PLAIN_TEXT",
     "value": "It is ______ what I like."
    },
    "responseType": "SINGLE_CHOICE",
    "required": true,
    "maxScore": 2,
    "options": [
     {
      "id": "A",
      "code": "A",
      "content": "yet"
     },
     {
      "id": "B",
      "code": "B",
      "content": "not"
     },
     {
      "id": "C",
      "code": "C",
      "content": "just"
     }
    ],
    "leftItems": [],
    "rightItems": [],
    "constraints": {},
    "answerKey": {
     "type": "SINGLE_CHOICE",
     "selectedOptionId": "C",
     "selectedOptionIds": [],
     "matches": {},
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
   "strategy": "EXACT_MATCH",
   "partialCredit": false,
   "maxScore": 2
  }
 },
 {
  "_id": "b1000000-0000-4000-8000-000000000015",
  "questionSetId": "b1000000-0000-4000-8000-000000000015",
  "revision": 1,
  "schemaVersion": 1,
  "partId": "16000000-0000-4000-8000-000000000011",
  "taskTypeCode": "GAP_FILL_CHOICE",
  "title": "I am never ______.",
  "instructions": "Chọn từ phù hợp để hoàn thành câu.",
  "accessLevel": "PREMIUM",
  "stimulus": null,
  "sections": [],
  "items": [
   {
    "id": "item_1",
    "sequenceNo": 1,
    "prompt": {
     "format": "PLAIN_TEXT",
     "value": "I am never ______."
    },
    "responseType": "SINGLE_CHOICE",
    "required": true,
    "maxScore": 2,
    "options": [
     {
      "id": "A",
      "code": "A",
      "content": "late"
     },
     {
      "id": "B",
      "code": "B",
      "content": "soon"
     },
     {
      "id": "C",
      "code": "C",
      "content": "early"
     }
    ],
    "leftItems": [],
    "rightItems": [],
    "constraints": {},
    "answerKey": {
     "type": "SINGLE_CHOICE",
     "selectedOptionId": "A",
     "selectedOptionIds": [],
     "matches": {},
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
   "strategy": "EXACT_MATCH",
   "partialCredit": false,
   "maxScore": 2
  }
 },
 {
  "_id": "b1000000-0000-4000-8000-000000000016",
  "questionSetId": "b1000000-0000-4000-8000-000000000016",
  "revision": 1,
  "schemaVersion": 1,
  "partId": "16000000-0000-4000-8000-000000000011",
  "taskTypeCode": "GAP_FILL_CHOICE",
  "title": "I am writing to tell you about my ______",
  "instructions": "Chọn từ phù hợp để hoàn thành câu.",
  "accessLevel": "PREMIUM",
  "stimulus": null,
  "sections": [],
  "items": [
   {
    "id": "item_1",
    "sequenceNo": 1,
    "prompt": {
     "format": "PLAIN_TEXT",
     "value": "I am writing to tell you about my ______"
    },
    "responseType": "SINGLE_CHOICE",
    "required": true,
    "maxScore": 2,
    "options": [
     {
      "id": "A",
      "code": "A",
      "content": "stay"
     },
     {
      "id": "B",
      "code": "B",
      "content": "dinner"
     },
     {
      "id": "C",
      "code": "C",
      "content": "garden"
     }
    ],
    "leftItems": [],
    "rightItems": [],
    "constraints": {},
    "answerKey": {
     "type": "SINGLE_CHOICE",
     "selectedOptionId": "A",
     "selectedOptionIds": [],
     "matches": {},
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
   "strategy": "EXACT_MATCH",
   "partialCredit": false,
   "maxScore": 2
  }
 },
 {
  "_id": "b1000000-0000-4000-8000-000000000017",
  "questionSetId": "b1000000-0000-4000-8000-000000000017",
  "revision": 1,
  "schemaVersion": 1,
  "partId": "16000000-0000-4000-8000-000000000011",
  "taskTypeCode": "GAP_FILL_CHOICE",
  "title": "The library is ______ today, so we can study there after class.",
  "instructions": "Chọn từ phù hợp để hoàn thành câu.",
  "accessLevel": "PREMIUM",
  "stimulus": null,
  "sections": [],
  "items": [
   {
    "id": "item_1",
    "sequenceNo": 1,
    "prompt": {
     "format": "PLAIN_TEXT",
     "value": "The library is ______ today, so we can study there after class."
    },
    "responseType": "SINGLE_CHOICE",
    "required": true,
    "maxScore": 2,
    "options": [
     {
      "id": "A",
      "code": "A",
      "content": "open"
     },
     {
      "id": "B",
      "code": "B",
      "content": "heavy"
     },
     {
      "id": "C",
      "code": "C",
      "content": "green"
     }
    ],
    "leftItems": [],
    "rightItems": [],
    "constraints": {},
    "answerKey": {
     "type": "SINGLE_CHOICE",
     "selectedOptionId": "A",
     "selectedOptionIds": [],
     "matches": {},
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
   "strategy": "EXACT_MATCH",
   "partialCredit": false,
   "maxScore": 2
  }
 },
 {
  "_id": "b1000000-0000-4000-8000-000000000018",
  "questionSetId": "b1000000-0000-4000-8000-000000000018",
  "revision": 1,
  "schemaVersion": 1,
  "partId": "16000000-0000-4000-8000-000000000011",
  "taskTypeCode": "GAP_FILL_CHOICE",
  "title": "I imagine you don't want to ______ this.",
  "instructions": "Chọn từ phù hợp để hoàn thành câu.",
  "accessLevel": "PREMIUM",
  "stimulus": null,
  "sections": [],
  "items": [
   {
    "id": "item_1",
    "sequenceNo": 1,
    "prompt": {
     "format": "PLAIN_TEXT",
     "value": "I imagine you don't want to ______ this."
    },
    "responseType": "SINGLE_CHOICE",
    "required": true,
    "maxScore": 2,
    "options": [
     {
      "id": "A",
      "code": "A",
      "content": "love"
     },
     {
      "id": "B",
      "code": "B",
      "content": "remember"
     },
     {
      "id": "C",
      "code": "C",
      "content": "miss"
     }
    ],
    "leftItems": [],
    "rightItems": [],
    "constraints": {},
    "answerKey": {
     "type": "SINGLE_CHOICE",
     "selectedOptionId": "C",
     "selectedOptionIds": [],
     "matches": {},
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
   "strategy": "EXACT_MATCH",
   "partialCredit": false,
   "maxScore": 2
  }
 },
 {
  "_id": "b1000000-0000-4000-8000-000000000019",
  "questionSetId": "b1000000-0000-4000-8000-000000000019",
  "revision": 1,
  "schemaVersion": 1,
  "partId": "16000000-0000-4000-8000-000000000011",
  "taskTypeCode": "GAP_FILL_CHOICE",
  "title": "In the ____ market, I cycle to work.",
  "instructions": "Chọn từ phù hợp để hoàn thành câu.",
  "accessLevel": "PREMIUM",
  "stimulus": null,
  "sections": [],
  "items": [
   {
    "id": "item_1",
    "sequenceNo": 1,
    "prompt": {
     "format": "PLAIN_TEXT",
     "value": "In the ____ market, I cycle to work."
    },
    "responseType": "SINGLE_CHOICE",
    "required": true,
    "maxScore": 2,
    "options": [
     {
      "id": "A",
      "code": "A",
      "content": "sun"
     },
     {
      "id": "B",
      "code": "B",
      "content": "morning"
     },
     {
      "id": "C",
      "code": "C",
      "content": "market"
     }
    ],
    "leftItems": [],
    "rightItems": [],
    "constraints": {},
    "answerKey": {
     "type": "SINGLE_CHOICE",
     "selectedOptionId": "B",
     "selectedOptionIds": [],
     "matches": {},
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
   "strategy": "EXACT_MATCH",
   "partialCredit": false,
   "maxScore": 2
  }
 },
 {
  "_id": "b1000000-0000-4000-8000-000000000020",
  "questionSetId": "b1000000-0000-4000-8000-000000000020",
  "revision": 1,
  "schemaVersion": 1,
  "partId": "16000000-0000-4000-8000-000000000011",
  "taskTypeCode": "GAP_FILL_CHOICE",
  "title": "The bus ______ are near my house.",
  "instructions": "Chọn từ phù hợp để hoàn thành câu.",
  "accessLevel": "PREMIUM",
  "stimulus": null,
  "sections": [],
  "items": [
   {
    "id": "item_1",
    "sequenceNo": 1,
    "prompt": {
     "format": "PLAIN_TEXT",
     "value": "The bus ______ are near my house."
    },
    "responseType": "SINGLE_CHOICE",
    "required": true,
    "maxScore": 2,
    "options": [
     {
      "id": "A",
      "code": "A",
      "content": "color"
     },
     {
      "id": "B",
      "code": "B",
      "content": "stops"
     },
     {
      "id": "C",
      "code": "C",
      "content": "driver"
     }
    ],
    "leftItems": [],
    "rightItems": [],
    "constraints": {},
    "answerKey": {
     "type": "SINGLE_CHOICE",
     "selectedOptionId": "B",
     "selectedOptionIds": [],
     "matches": {},
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
   "strategy": "EXACT_MATCH",
   "partialCredit": false,
   "maxScore": 2
  }
 },
 {
  "_id": "b1000000-0000-4000-8000-000000000021",
  "questionSetId": "b1000000-0000-4000-8000-000000000021",
  "revision": 1,
  "schemaVersion": 1,
  "partId": "16000000-0000-4000-8000-000000000011",
  "taskTypeCode": "GAP_FILL_CHOICE",
  "title": "I didn't ______ it.",
  "instructions": "Chọn từ phù hợp để hoàn thành câu.",
  "accessLevel": "PREMIUM",
  "stimulus": null,
  "sections": [],
  "items": [
   {
    "id": "item_1",
    "sequenceNo": 1,
    "prompt": {
     "format": "PLAIN_TEXT",
     "value": "I didn't ______ it."
    },
    "responseType": "SINGLE_CHOICE",
    "required": true,
    "maxScore": 2,
    "options": [
     {
      "id": "A",
      "code": "A",
      "content": "eat"
     },
     {
      "id": "B",
      "code": "B",
      "content": "drink"
     },
     {
      "id": "C",
      "code": "C",
      "content": "buy"
     }
    ],
    "leftItems": [],
    "rightItems": [],
    "constraints": {},
    "answerKey": {
     "type": "SINGLE_CHOICE",
     "selectedOptionId": "C",
     "selectedOptionIds": [],
     "matches": {},
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
   "strategy": "EXACT_MATCH",
   "partialCredit": false,
   "maxScore": 2
  }
 },
 {
  "_id": "b1000000-0000-4000-8000-000000000022",
  "questionSetId": "b1000000-0000-4000-8000-000000000022",
  "revision": 1,
  "schemaVersion": 1,
  "partId": "16000000-0000-4000-8000-000000000011",
  "taskTypeCode": "GAP_FILL_CHOICE",
  "title": "My ____ come and exercise with me.",
  "instructions": "Chọn từ phù hợp để hoàn thành câu.",
  "accessLevel": "PREMIUM",
  "stimulus": null,
  "sections": [],
  "items": [
   {
    "id": "item_1",
    "sequenceNo": 1,
    "prompt": {
     "format": "PLAIN_TEXT",
     "value": "My ____ come and exercise with me."
    },
    "responseType": "SINGLE_CHOICE",
    "required": true,
    "maxScore": 2,
    "options": [
     {
      "id": "A",
      "code": "A",
      "content": "friends"
     },
     {
      "id": "B",
      "code": "B",
      "content": "leave"
     },
     {
      "id": "C",
      "code": "C",
      "content": "food"
     }
    ],
    "leftItems": [],
    "rightItems": [],
    "constraints": {},
    "answerKey": {
     "type": "SINGLE_CHOICE",
     "selectedOptionId": "A",
     "selectedOptionIds": [],
     "matches": {},
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
   "strategy": "EXACT_MATCH",
   "partialCredit": false,
   "maxScore": 2
  }
 },
 {
  "_id": "b1000000-0000-4000-8000-000000000023",
  "questionSetId": "b1000000-0000-4000-8000-000000000023",
  "revision": 1,
  "schemaVersion": 1,
  "partId": "16000000-0000-4000-8000-000000000011",
  "taskTypeCode": "GAP_FILL_CHOICE",
  "title": "My flat is near university, so I can ______ to my class.",
  "instructions": "Chọn từ phù hợp để hoàn thành câu.",
  "accessLevel": "PREMIUM",
  "stimulus": null,
  "sections": [],
  "items": [
   {
    "id": "item_1",
    "sequenceNo": 1,
    "prompt": {
     "format": "PLAIN_TEXT",
     "value": "My flat is near university, so I can ______ to my class."
    },
    "responseType": "SINGLE_CHOICE",
    "required": true,
    "maxScore": 2,
    "options": [
     {
      "id": "A",
      "code": "A",
      "content": "train"
     },
     {
      "id": "B",
      "code": "B",
      "content": "sleep"
     },
     {
      "id": "C",
      "code": "C",
      "content": "walk"
     }
    ],
    "leftItems": [],
    "rightItems": [],
    "constraints": {},
    "answerKey": {
     "type": "SINGLE_CHOICE",
     "selectedOptionId": "C",
     "selectedOptionIds": [],
     "matches": {},
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
   "strategy": "EXACT_MATCH",
   "partialCredit": false,
   "maxScore": 2
  }
 },
 {
  "_id": "b1000000-0000-4000-8000-000000000024",
  "questionSetId": "b1000000-0000-4000-8000-000000000024",
  "revision": 1,
  "schemaVersion": 1,
  "partId": "16000000-0000-4000-8000-000000000011",
  "taskTypeCode": "GAP_FILL_CHOICE",
  "title": "I have ______.",
  "instructions": "Chọn từ phù hợp để hoàn thành câu.",
  "accessLevel": "PREMIUM",
  "stimulus": null,
  "sections": [],
  "items": [
   {
    "id": "item_1",
    "sequenceNo": 1,
    "prompt": {
     "format": "PLAIN_TEXT",
     "value": "I have ______."
    },
    "responseType": "SINGLE_CHOICE",
    "required": true,
    "maxScore": 2,
    "options": [
     {
      "id": "A",
      "code": "A",
      "content": "lunch"
     },
     {
      "id": "B",
      "code": "B",
      "content": "bed"
     },
     {
      "id": "C",
      "code": "C",
      "content": "tutor"
     }
    ],
    "leftItems": [],
    "rightItems": [],
    "constraints": {},
    "answerKey": {
     "type": "SINGLE_CHOICE",
     "selectedOptionId": "A",
     "selectedOptionIds": [],
     "matches": {},
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
   "strategy": "EXACT_MATCH",
   "partialCredit": false,
   "maxScore": 2
  }
 },
 {
  "_id": "b1000000-0000-4000-8000-000000000025",
  "questionSetId": "b1000000-0000-4000-8000-000000000025",
  "revision": 1,
  "schemaVersion": 1,
  "partId": "16000000-0000-4000-8000-000000000011",
  "taskTypeCode": "GAP_FILL_CHOICE",
  "title": "I have an ______ holiday.",
  "instructions": "Chọn từ phù hợp để hoàn thành câu.",
  "accessLevel": "PREMIUM",
  "stimulus": null,
  "sections": [],
  "items": [
   {
    "id": "item_1",
    "sequenceNo": 1,
    "prompt": {
     "format": "PLAIN_TEXT",
     "value": "I have an ______ holiday."
    },
    "responseType": "SINGLE_CHOICE",
    "required": true,
    "maxScore": 2,
    "options": [
     {
      "id": "A",
      "code": "A",
      "content": "tired"
     },
     {
      "id": "B",
      "code": "B",
      "content": "enjoyable"
     },
     {
      "id": "C",
      "code": "C",
      "content": "good"
     }
    ],
    "leftItems": [],
    "rightItems": [],
    "constraints": {},
    "answerKey": {
     "type": "SINGLE_CHOICE",
     "selectedOptionId": "B",
     "selectedOptionIds": [],
     "matches": {},
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
   "strategy": "EXACT_MATCH",
   "partialCredit": false,
   "maxScore": 2
  }
 },
 {
  "_id": "b1000000-0000-4000-8000-000000000026",
  "questionSetId": "b1000000-0000-4000-8000-000000000026",
  "revision": 1,
  "schemaVersion": 1,
  "partId": "16000000-0000-4000-8000-000000000011",
  "taskTypeCode": "GAP_FILL_CHOICE",
  "title": "I ______ you earlier but you were not home.",
  "instructions": "Chọn từ phù hợp để hoàn thành câu.",
  "accessLevel": "PREMIUM",
  "stimulus": null,
  "sections": [],
  "items": [
   {
    "id": "item_1",
    "sequenceNo": 1,
    "prompt": {
     "format": "PLAIN_TEXT",
     "value": "I ______ you earlier but you were not home."
    },
    "responseType": "SINGLE_CHOICE",
    "required": true,
    "maxScore": 2,
    "options": [
     {
      "id": "A",
      "code": "A",
      "content": "called"
     },
     {
      "id": "B",
      "code": "B",
      "content": "told"
     },
     {
      "id": "C",
      "code": "C",
      "content": "said"
     }
    ],
    "leftItems": [],
    "rightItems": [],
    "constraints": {},
    "answerKey": {
     "type": "SINGLE_CHOICE",
     "selectedOptionId": "A",
     "selectedOptionIds": [],
     "matches": {},
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
   "strategy": "EXACT_MATCH",
   "partialCredit": false,
   "maxScore": 2
  }
 },
 {
  "_id": "b1000000-0000-4000-8000-000000000027",
  "questionSetId": "b1000000-0000-4000-8000-000000000027",
  "revision": 1,
  "schemaVersion": 1,
  "partId": "16000000-0000-4000-8000-000000000011",
  "taskTypeCode": "GAP_FILL_CHOICE",
  "title": "Could you get the financial ______ and check for any errors?",
  "instructions": "Chọn từ phù hợp để hoàn thành câu.",
  "accessLevel": "PREMIUM",
  "stimulus": null,
  "sections": [],
  "items": [
   {
    "id": "item_1",
    "sequenceNo": 1,
    "prompt": {
     "format": "PLAIN_TEXT",
     "value": "Could you get the financial ______ and check for any errors?"
    },
    "responseType": "SINGLE_CHOICE",
    "required": true,
    "maxScore": 2,
    "options": [
     {
      "id": "A",
      "code": "A",
      "content": "department"
     },
     {
      "id": "B",
      "code": "B",
      "content": "statement"
     },
     {
      "id": "C",
      "code": "C",
      "content": "accountant"
     }
    ],
    "leftItems": [],
    "rightItems": [],
    "constraints": {},
    "answerKey": {
     "type": "SINGLE_CHOICE",
     "selectedOptionId": "B",
     "selectedOptionIds": [],
     "matches": {},
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
   "strategy": "EXACT_MATCH",
   "partialCredit": false,
   "maxScore": 2
  }
 },
 {
  "_id": "b1000000-0000-4000-8000-000000000028",
  "questionSetId": "b1000000-0000-4000-8000-000000000028",
  "revision": 1,
  "schemaVersion": 1,
  "partId": "16000000-0000-4000-8000-000000000011",
  "taskTypeCode": "GAP_FILL_CHOICE",
  "title": "I eat lunch in the ______.",
  "instructions": "Chọn từ phù hợp để hoàn thành câu.",
  "accessLevel": "PREMIUM",
  "stimulus": null,
  "sections": [],
  "items": [
   {
    "id": "item_1",
    "sequenceNo": 1,
    "prompt": {
     "format": "PLAIN_TEXT",
     "value": "I eat lunch in the ______."
    },
    "responseType": "SINGLE_CHOICE",
    "required": true,
    "maxScore": 2,
    "options": [
     {
      "id": "A",
      "code": "A",
      "content": "park"
     },
     {
      "id": "B",
      "code": "B",
      "content": "city"
     },
     {
      "id": "C",
      "code": "C",
      "content": "village"
     }
    ],
    "leftItems": [],
    "rightItems": [],
    "constraints": {},
    "answerKey": {
     "type": "SINGLE_CHOICE",
     "selectedOptionId": "A",
     "selectedOptionIds": [],
     "matches": {},
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
   "strategy": "EXACT_MATCH",
   "partialCredit": false,
   "maxScore": 2
  }
 },
 {
  "_id": "b1000000-0000-4000-8000-000000000029",
  "questionSetId": "b1000000-0000-4000-8000-000000000029",
  "revision": 1,
  "schemaVersion": 1,
  "partId": "16000000-0000-4000-8000-000000000011",
  "taskTypeCode": "GAP_FILL_CHOICE",
  "title": "We are on the ______.",
  "instructions": "Chọn từ phù hợp để hoàn thành câu.",
  "accessLevel": "PREMIUM",
  "stimulus": null,
  "sections": [],
  "items": [
   {
    "id": "item_1",
    "sequenceNo": 1,
    "prompt": {
     "format": "PLAIN_TEXT",
     "value": "We are on the ______."
    },
    "responseType": "SINGLE_CHOICE",
    "required": true,
    "maxScore": 2,
    "options": [
     {
      "id": "A",
      "code": "A",
      "content": "city"
     },
     {
      "id": "B",
      "code": "B",
      "content": "countryside"
     },
     {
      "id": "C",
      "code": "C",
      "content": "boat"
     }
    ],
    "leftItems": [],
    "rightItems": [],
    "constraints": {},
    "answerKey": {
     "type": "SINGLE_CHOICE",
     "selectedOptionId": "C",
     "selectedOptionIds": [],
     "matches": {},
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
   "strategy": "EXACT_MATCH",
   "partialCredit": false,
   "maxScore": 2
  }
 },
 {
  "_id": "b1000000-0000-4000-8000-000000000030",
  "questionSetId": "b1000000-0000-4000-8000-000000000030",
  "revision": 1,
  "schemaVersion": 1,
  "partId": "16000000-0000-4000-8000-000000000011",
  "taskTypeCode": "GAP_FILL_CHOICE",
  "title": "Can you print a ______ for me?",
  "instructions": "Chọn từ phù hợp để hoàn thành câu.",
  "accessLevel": "PREMIUM",
  "stimulus": null,
  "sections": [],
  "items": [
   {
    "id": "item_1",
    "sequenceNo": 1,
    "prompt": {
     "format": "PLAIN_TEXT",
     "value": "Can you print a ______ for me?"
    },
    "responseType": "SINGLE_CHOICE",
    "required": true,
    "maxScore": 2,
    "options": [
     {
      "id": "A",
      "code": "A",
      "content": "information"
     },
     {
      "id": "B",
      "code": "B",
      "content": "copy"
     },
     {
      "id": "C",
      "code": "C",
      "content": "paper"
     }
    ],
    "leftItems": [],
    "rightItems": [],
    "constraints": {},
    "answerKey": {
     "type": "SINGLE_CHOICE",
     "selectedOptionId": "B",
     "selectedOptionIds": [],
     "matches": {},
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
   "strategy": "EXACT_MATCH",
   "partialCredit": false,
   "maxScore": 2
  }
 },
 {
  "_id": "b1000000-0000-4000-8000-000000000031",
  "questionSetId": "b1000000-0000-4000-8000-000000000031",
  "revision": 1,
  "schemaVersion": 1,
  "partId": "16000000-0000-4000-8000-000000000011",
  "taskTypeCode": "GAP_FILL_CHOICE",
  "title": "I ______ it with my friend.",
  "instructions": "Chọn từ phù hợp để hoàn thành câu.",
  "accessLevel": "PREMIUM",
  "stimulus": null,
  "sections": [],
  "items": [
   {
    "id": "item_1",
    "sequenceNo": 1,
    "prompt": {
     "format": "PLAIN_TEXT",
     "value": "I ______ it with my friend."
    },
    "responseType": "SINGLE_CHOICE",
    "required": true,
    "maxScore": 2,
    "options": [
     {
      "id": "A",
      "code": "A",
      "content": "share"
     },
     {
      "id": "B",
      "code": "B",
      "content": "drink"
     },
     {
      "id": "C",
      "code": "C",
      "content": "hold"
     }
    ],
    "leftItems": [],
    "rightItems": [],
    "constraints": {},
    "answerKey": {
     "type": "SINGLE_CHOICE",
     "selectedOptionId": "A",
     "selectedOptionIds": [],
     "matches": {},
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
   "strategy": "EXACT_MATCH",
   "partialCredit": false,
   "maxScore": 2
  }
 },
 {
  "_id": "b1000000-0000-4000-8000-000000000032",
  "questionSetId": "b1000000-0000-4000-8000-000000000032",
  "revision": 1,
  "schemaVersion": 1,
  "partId": "16000000-0000-4000-8000-000000000011",
  "taskTypeCode": "GAP_FILL_CHOICE",
  "title": "My flat is near the university, so I can ______ to my class.",
  "instructions": "Chọn từ phù hợp để hoàn thành câu.",
  "accessLevel": "PREMIUM",
  "stimulus": null,
  "sections": [],
  "items": [
   {
    "id": "item_1",
    "sequenceNo": 1,
    "prompt": {
     "format": "PLAIN_TEXT",
     "value": "My flat is near the university, so I can ______ to my class."
    },
    "responseType": "SINGLE_CHOICE",
    "required": true,
    "maxScore": 2,
    "options": [
     {
      "id": "A",
      "code": "A",
      "content": "train"
     },
     {
      "id": "B",
      "code": "B",
      "content": "sleep"
     },
     {
      "id": "C",
      "code": "C",
      "content": "walk"
     }
    ],
    "leftItems": [],
    "rightItems": [],
    "constraints": {},
    "answerKey": {
     "type": "SINGLE_CHOICE",
     "selectedOptionId": "C",
     "selectedOptionIds": [],
     "matches": {},
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
   "strategy": "EXACT_MATCH",
   "partialCredit": false,
   "maxScore": 2
  }
 },
 {
  "_id": "b1000000-0000-4000-8000-000000000033",
  "questionSetId": "b1000000-0000-4000-8000-000000000033",
  "revision": 1,
  "schemaVersion": 1,
  "partId": "16000000-0000-4000-8000-000000000011",
  "taskTypeCode": "GAP_FILL_CHOICE",
  "title": "I live ______ the city.",
  "instructions": "Chọn từ phù hợp để hoàn thành câu.",
  "accessLevel": "PREMIUM",
  "stimulus": null,
  "sections": [],
  "items": [
   {
    "id": "item_1",
    "sequenceNo": 1,
    "prompt": {
     "format": "PLAIN_TEXT",
     "value": "I live ______ the city."
    },
    "responseType": "SINGLE_CHOICE",
    "required": true,
    "maxScore": 2,
    "options": [
     {
      "id": "A",
      "code": "A",
      "content": "near"
     },
     {
      "id": "B",
      "code": "B",
      "content": "next"
     },
     {
      "id": "C",
      "code": "C",
      "content": "far"
     }
    ],
    "leftItems": [],
    "rightItems": [],
    "constraints": {},
    "answerKey": {
     "type": "SINGLE_CHOICE",
     "selectedOptionId": "A",
     "selectedOptionIds": [],
     "matches": {},
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
   "strategy": "EXACT_MATCH",
   "partialCredit": false,
   "maxScore": 2
  }
 },
 {
  "_id": "b1000000-0000-4000-8000-000000000034",
  "questionSetId": "b1000000-0000-4000-8000-000000000034",
  "revision": 1,
  "schemaVersion": 1,
  "partId": "16000000-0000-4000-8000-000000000011",
  "taskTypeCode": "GAP_FILL_CHOICE",
  "title": "My teacher asked me to ______ the email before lunch.",
  "instructions": "Chọn từ phù hợp để hoàn thành câu.",
  "accessLevel": "PREMIUM",
  "stimulus": null,
  "sections": [],
  "items": [
   {
    "id": "item_1",
    "sequenceNo": 1,
    "prompt": {
     "format": "PLAIN_TEXT",
     "value": "My teacher asked me to ______ the email before lunch."
    },
    "responseType": "SINGLE_CHOICE",
    "required": true,
    "maxScore": 2,
    "options": [
     {
      "id": "A",
      "code": "A",
      "content": "send"
     },
     {
      "id": "B",
      "code": "B",
      "content": "grow"
     },
     {
      "id": "C",
      "code": "C",
      "content": "paint"
     }
    ],
    "leftItems": [],
    "rightItems": [],
    "constraints": {},
    "answerKey": {
     "type": "SINGLE_CHOICE",
     "selectedOptionId": "A",
     "selectedOptionIds": [],
     "matches": {},
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
   "strategy": "EXACT_MATCH",
   "partialCredit": false,
   "maxScore": 2
  }
 },
 {
  "_id": "b1000000-0000-4000-8000-000000000035",
  "questionSetId": "b1000000-0000-4000-8000-000000000035",
  "revision": 1,
  "schemaVersion": 1,
  "partId": "16000000-0000-4000-8000-000000000011",
  "taskTypeCode": "GAP_FILL_CHOICE",
  "title": "My ____ cycle to work.",
  "instructions": "Chọn từ phù hợp để hoàn thành câu.",
  "accessLevel": "PREMIUM",
  "stimulus": null,
  "sections": [],
  "items": [
   {
    "id": "item_1",
    "sequenceNo": 1,
    "prompt": {
     "format": "PLAIN_TEXT",
     "value": "My ____ cycle to work."
    },
    "responseType": "SINGLE_CHOICE",
    "required": true,
    "maxScore": 2,
    "options": [
     {
      "id": "A",
      "code": "A",
      "content": "friends"
     },
     {
      "id": "B",
      "code": "B",
      "content": "house"
     },
     {
      "id": "C",
      "code": "C",
      "content": "car"
     }
    ],
    "leftItems": [],
    "rightItems": [],
    "constraints": {},
    "answerKey": {
     "type": "SINGLE_CHOICE",
     "selectedOptionId": "A",
     "selectedOptionIds": [],
     "matches": {},
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
   "strategy": "EXACT_MATCH",
   "partialCredit": false,
   "maxScore": 2
  }
 },
 {
  "_id": "b1000000-0000-4000-8000-000000000036",
  "questionSetId": "b1000000-0000-4000-8000-000000000036",
  "revision": 1,
  "schemaVersion": 1,
  "partId": "16000000-0000-4000-8000-000000000011",
  "taskTypeCode": "GAP_FILL_CHOICE",
  "title": "My house is ______ and you can easily recognize it by the color.",
  "instructions": "Chọn từ phù hợp để hoàn thành câu.",
  "accessLevel": "PREMIUM",
  "stimulus": null,
  "sections": [],
  "items": [
   {
    "id": "item_1",
    "sequenceNo": 1,
    "prompt": {
     "format": "PLAIN_TEXT",
     "value": "My house is ______ and you can easily recognize it by the color."
    },
    "responseType": "SINGLE_CHOICE",
    "required": true,
    "maxScore": 2,
    "options": [
     {
      "id": "A",
      "code": "A",
      "content": "tall"
     },
     {
      "id": "B",
      "code": "B",
      "content": "fat"
     },
     {
      "id": "C",
      "code": "C",
      "content": "green"
     }
    ],
    "leftItems": [],
    "rightItems": [],
    "constraints": {},
    "answerKey": {
     "type": "SINGLE_CHOICE",
     "selectedOptionId": "C",
     "selectedOptionIds": [],
     "matches": {},
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
   "strategy": "EXACT_MATCH",
   "partialCredit": false,
   "maxScore": 2
  }
 },
 {
  "_id": "b1000000-0000-4000-8000-000000000037",
  "questionSetId": "b1000000-0000-4000-8000-000000000037",
  "revision": 1,
  "schemaVersion": 1,
  "partId": "16000000-0000-4000-8000-000000000011",
  "taskTypeCode": "GAP_FILL_CHOICE",
  "title": "I ______ a program on TV.",
  "instructions": "Chọn từ phù hợp để hoàn thành câu.",
  "accessLevel": "PREMIUM",
  "stimulus": null,
  "sections": [],
  "items": [
   {
    "id": "item_1",
    "sequenceNo": 1,
    "prompt": {
     "format": "PLAIN_TEXT",
     "value": "I ______ a program on TV."
    },
    "responseType": "SINGLE_CHOICE",
    "required": true,
    "maxScore": 2,
    "options": [
     {
      "id": "A",
      "code": "A",
      "content": "ate"
     },
     {
      "id": "B",
      "code": "B",
      "content": "saw"
     },
     {
      "id": "C",
      "code": "C",
      "content": "watched"
     }
    ],
    "leftItems": [],
    "rightItems": [],
    "constraints": {},
    "answerKey": {
     "type": "SINGLE_CHOICE",
     "selectedOptionId": "C",
     "selectedOptionIds": [],
     "matches": {},
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
   "strategy": "EXACT_MATCH",
   "partialCredit": false,
   "maxScore": 2
  }
 },
 {
  "_id": "b1000000-0000-4000-8000-000000000038",
  "questionSetId": "b1000000-0000-4000-8000-000000000038",
  "revision": 1,
  "schemaVersion": 1,
  "partId": "16000000-0000-4000-8000-000000000011",
  "taskTypeCode": "GAP_FILL_CHOICE",
  "title": "I ____ my car at home and go for a walk.",
  "instructions": "Chọn từ phù hợp để hoàn thành câu.",
  "accessLevel": "PREMIUM",
  "stimulus": null,
  "sections": [],
  "items": [
   {
    "id": "item_1",
    "sequenceNo": 1,
    "prompt": {
     "format": "PLAIN_TEXT",
     "value": "I ____ my car at home and go for a walk."
    },
    "responseType": "SINGLE_CHOICE",
    "required": true,
    "maxScore": 2,
    "options": [
     {
      "id": "A",
      "code": "A",
      "content": "leave"
     },
     {
      "id": "B",
      "code": "B",
      "content": "bad"
     },
     {
      "id": "C",
      "code": "C",
      "content": "food"
     }
    ],
    "leftItems": [],
    "rightItems": [],
    "constraints": {},
    "answerKey": {
     "type": "SINGLE_CHOICE",
     "selectedOptionId": "A",
     "selectedOptionIds": [],
     "matches": {},
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
   "strategy": "EXACT_MATCH",
   "partialCredit": false,
   "maxScore": 2
  }
 },
 {
  "_id": "b1000000-0000-4000-8000-000000000039",
  "questionSetId": "b1000000-0000-4000-8000-000000000039",
  "revision": 1,
  "schemaVersion": 1,
  "partId": "16000000-0000-4000-8000-000000000011",
  "taskTypeCode": "GAP_FILL_CHOICE",
  "title": "There is a girl living with me, I met her for the ______ time.",
  "instructions": "Chọn từ phù hợp để hoàn thành câu.",
  "accessLevel": "PREMIUM",
  "stimulus": null,
  "sections": [],
  "items": [
   {
    "id": "item_1",
    "sequenceNo": 1,
    "prompt": {
     "format": "PLAIN_TEXT",
     "value": "There is a girl living with me, I met her for the ______ time."
    },
    "responseType": "SINGLE_CHOICE",
    "required": true,
    "maxScore": 2,
    "options": [
     {
      "id": "A",
      "code": "A",
      "content": "very"
     },
     {
      "id": "B",
      "code": "B",
      "content": "first"
     },
     {
      "id": "C",
      "code": "C",
      "content": "one"
     }
    ],
    "leftItems": [],
    "rightItems": [],
    "constraints": {},
    "answerKey": {
     "type": "SINGLE_CHOICE",
     "selectedOptionId": "B",
     "selectedOptionIds": [],
     "matches": {},
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
   "strategy": "EXACT_MATCH",
   "partialCredit": false,
   "maxScore": 2
  }
 },
 {
  "_id": "b1000000-0000-4000-8000-000000000040",
  "questionSetId": "b1000000-0000-4000-8000-000000000040",
  "revision": 1,
  "schemaVersion": 1,
  "partId": "16000000-0000-4000-8000-000000000011",
  "taskTypeCode": "GAP_FILL_CHOICE",
  "title": "I ______ the office.",
  "instructions": "Chọn từ phù hợp để hoàn thành câu.",
  "accessLevel": "PREMIUM",
  "stimulus": null,
  "sections": [],
  "items": [
   {
    "id": "item_1",
    "sequenceNo": 1,
    "prompt": {
     "format": "PLAIN_TEXT",
     "value": "I ______ the office."
    },
    "responseType": "SINGLE_CHOICE",
    "required": true,
    "maxScore": 2,
    "options": [
     {
      "id": "A",
      "code": "A",
      "content": "go"
     },
     {
      "id": "B",
      "code": "B",
      "content": "leave"
     },
     {
      "id": "C",
      "code": "C",
      "content": "return"
     }
    ],
    "leftItems": [],
    "rightItems": [],
    "constraints": {},
    "answerKey": {
     "type": "SINGLE_CHOICE",
     "selectedOptionId": "B",
     "selectedOptionIds": [],
     "matches": {},
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
   "strategy": "EXACT_MATCH",
   "partialCredit": false,
   "maxScore": 2
  }
 },
 {
  "_id": "b1000000-0000-4000-8000-000000000041",
  "questionSetId": "b1000000-0000-4000-8000-000000000041",
  "revision": 1,
  "schemaVersion": 1,
  "partId": "16000000-0000-4000-8000-000000000011",
  "taskTypeCode": "GAP_FILL_CHOICE",
  "title": "After ______ so hard, I need a rest.",
  "instructions": "Chọn từ phù hợp để hoàn thành câu.",
  "accessLevel": "PREMIUM",
  "stimulus": null,
  "sections": [],
  "items": [
   {
    "id": "item_1",
    "sequenceNo": 1,
    "prompt": {
     "format": "PLAIN_TEXT",
     "value": "After ______ so hard, I need a rest."
    },
    "responseType": "SINGLE_CHOICE",
    "required": true,
    "maxScore": 2,
    "options": [
     {
      "id": "A",
      "code": "A",
      "content": "working"
     },
     {
      "id": "B",
      "code": "B",
      "content": "sleeping"
     },
     {
      "id": "C",
      "code": "C",
      "content": "eating"
     }
    ],
    "leftItems": [],
    "rightItems": [],
    "constraints": {},
    "answerKey": {
     "type": "SINGLE_CHOICE",
     "selectedOptionId": "A",
     "selectedOptionIds": [],
     "matches": {},
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
   "strategy": "EXACT_MATCH",
   "partialCredit": false,
   "maxScore": 2
  }
 },
 {
  "_id": "b1000000-0000-4000-8000-000000000042",
  "questionSetId": "b1000000-0000-4000-8000-000000000042",
  "revision": 1,
  "schemaVersion": 1,
  "partId": "16000000-0000-4000-8000-000000000011",
  "taskTypeCode": "GAP_FILL_CHOICE",
  "title": "Can you be ______ before 7pm?",
  "instructions": "Chọn từ phù hợp để hoàn thành câu.",
  "accessLevel": "PREMIUM",
  "stimulus": null,
  "sections": [],
  "items": [
   {
    "id": "item_1",
    "sequenceNo": 1,
    "prompt": {
     "format": "PLAIN_TEXT",
     "value": "Can you be ______ before 7pm?"
    },
    "responseType": "SINGLE_CHOICE",
    "required": true,
    "maxScore": 2,
    "options": [
     {
      "id": "A",
      "code": "A",
      "content": "early"
     },
     {
      "id": "B",
      "code": "B",
      "content": "sleepy"
     },
     {
      "id": "C",
      "code": "C",
      "content": "ready"
     }
    ],
    "leftItems": [],
    "rightItems": [],
    "constraints": {},
    "answerKey": {
     "type": "SINGLE_CHOICE",
     "selectedOptionId": "C",
     "selectedOptionIds": [],
     "matches": {},
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
   "strategy": "EXACT_MATCH",
   "partialCredit": false,
   "maxScore": 2
  }
 },
 {
  "_id": "b1000000-0000-4000-8000-000000000043",
  "questionSetId": "b1000000-0000-4000-8000-000000000043",
  "revision": 1,
  "schemaVersion": 1,
  "partId": "16000000-0000-4000-8000-000000000011",
  "taskTypeCode": "GAP_FILL_CHOICE",
  "title": "I am going to wear it ______ my birthday party.",
  "instructions": "Chọn từ phù hợp để hoàn thành câu.",
  "accessLevel": "PREMIUM",
  "stimulus": null,
  "sections": [],
  "items": [
   {
    "id": "item_1",
    "sequenceNo": 1,
    "prompt": {
     "format": "PLAIN_TEXT",
     "value": "I am going to wear it ______ my birthday party."
    },
    "responseType": "SINGLE_CHOICE",
    "required": true,
    "maxScore": 2,
    "options": [
     {
      "id": "A",
      "code": "A",
      "content": "to"
     },
     {
      "id": "B",
      "code": "B",
      "content": "on"
     },
     {
      "id": "C",
      "code": "C",
      "content": "at"
     }
    ],
    "leftItems": [],
    "rightItems": [],
    "constraints": {},
    "answerKey": {
     "type": "SINGLE_CHOICE",
     "selectedOptionId": "A",
     "selectedOptionIds": [],
     "matches": {},
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
   "strategy": "EXACT_MATCH",
   "partialCredit": false,
   "maxScore": 2
  }
 },
 {
  "_id": "b1000000-0000-4000-8000-000000000044",
  "questionSetId": "b1000000-0000-4000-8000-000000000044",
  "revision": 1,
  "schemaVersion": 1,
  "partId": "16000000-0000-4000-8000-000000000011",
  "taskTypeCode": "GAP_FILL_CHOICE",
  "title": "We eat dinner ______ we go to church.",
  "instructions": "Chọn từ phù hợp để hoàn thành câu.",
  "accessLevel": "PREMIUM",
  "stimulus": null,
  "sections": [],
  "items": [
   {
    "id": "item_1",
    "sequenceNo": 1,
    "prompt": {
     "format": "PLAIN_TEXT",
     "value": "We eat dinner ______ we go to church."
    },
    "responseType": "SINGLE_CHOICE",
    "required": true,
    "maxScore": 2,
    "options": [
     {
      "id": "A",
      "code": "A",
      "content": "after"
     },
     {
      "id": "B",
      "code": "B",
      "content": "then"
     },
     {
      "id": "C",
      "code": "C",
      "content": "before"
     }
    ],
    "leftItems": [],
    "rightItems": [],
    "constraints": {},
    "answerKey": {
     "type": "SINGLE_CHOICE",
     "selectedOptionId": "C",
     "selectedOptionIds": [],
     "matches": {},
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
   "strategy": "EXACT_MATCH",
   "partialCredit": false,
   "maxScore": 2
  }
 },
 {
  "_id": "b1000000-0000-4000-8000-000000000045",
  "questionSetId": "b1000000-0000-4000-8000-000000000045",
  "revision": 1,
  "schemaVersion": 1,
  "partId": "16000000-0000-4000-8000-000000000011",
  "taskTypeCode": "GAP_FILL_CHOICE",
  "title": "I am ______ with my work.",
  "instructions": "Chọn từ phù hợp để hoàn thành câu.",
  "accessLevel": "PREMIUM",
  "stimulus": null,
  "sections": [],
  "items": [
   {
    "id": "item_1",
    "sequenceNo": 1,
    "prompt": {
     "format": "PLAIN_TEXT",
     "value": "I am ______ with my work."
    },
    "responseType": "SINGLE_CHOICE",
    "required": true,
    "maxScore": 2,
    "options": [
     {
      "id": "A",
      "code": "A",
      "content": "busy"
     },
     {
      "id": "B",
      "code": "B",
      "content": "table"
     },
     {
      "id": "C",
      "code": "C",
      "content": "round"
     }
    ],
    "leftItems": [],
    "rightItems": [],
    "constraints": {},
    "answerKey": {
     "type": "SINGLE_CHOICE",
     "selectedOptionId": "A",
     "selectedOptionIds": [],
     "matches": {},
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
   "strategy": "EXACT_MATCH",
   "partialCredit": false,
   "maxScore": 2
  }
 },
 {
  "_id": "b1000000-0000-4000-8000-000000000046",
  "questionSetId": "b1000000-0000-4000-8000-000000000046",
  "revision": 1,
  "schemaVersion": 1,
  "partId": "16000000-0000-4000-8000-000000000011",
  "taskTypeCode": "GAP_FILL_CHOICE",
  "title": "We are in the same ______.",
  "instructions": "Chọn từ phù hợp để hoàn thành câu.",
  "accessLevel": "PREMIUM",
  "stimulus": null,
  "sections": [],
  "items": [
   {
    "id": "item_1",
    "sequenceNo": 1,
    "prompt": {
     "format": "PLAIN_TEXT",
     "value": "We are in the same ______."
    },
    "responseType": "SINGLE_CHOICE",
    "required": true,
    "maxScore": 2,
    "options": [
     {
      "id": "A",
      "code": "A",
      "content": "door"
     },
     {
      "id": "B",
      "code": "B",
      "content": "class"
     },
     {
      "id": "C",
      "code": "C",
      "content": "chair"
     }
    ],
    "leftItems": [],
    "rightItems": [],
    "constraints": {},
    "answerKey": {
     "type": "SINGLE_CHOICE",
     "selectedOptionId": "B",
     "selectedOptionIds": [],
     "matches": {},
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
   "strategy": "EXACT_MATCH",
   "partialCredit": false,
   "maxScore": 2
  }
 },
 {
  "_id": "b1000000-0000-4000-8000-000000000047",
  "questionSetId": "b1000000-0000-4000-8000-000000000047",
  "revision": 1,
  "schemaVersion": 1,
  "partId": "16000000-0000-4000-8000-000000000011",
  "taskTypeCode": "GAP_FILL_CHOICE",
  "title": "I ______ it will help clarify the issue.",
  "instructions": "Chọn từ phù hợp để hoàn thành câu.",
  "accessLevel": "PREMIUM",
  "stimulus": null,
  "sections": [],
  "items": [
   {
    "id": "item_1",
    "sequenceNo": 1,
    "prompt": {
     "format": "PLAIN_TEXT",
     "value": "I ______ it will help clarify the issue."
    },
    "responseType": "SINGLE_CHOICE",
    "required": true,
    "maxScore": 2,
    "options": [
     {
      "id": "A",
      "code": "A",
      "content": "sure"
     },
     {
      "id": "B",
      "code": "B",
      "content": "assure"
     },
     {
      "id": "C",
      "code": "C",
      "content": "think"
     }
    ],
    "leftItems": [],
    "rightItems": [],
    "constraints": {},
    "answerKey": {
     "type": "SINGLE_CHOICE",
     "selectedOptionId": "C",
     "selectedOptionIds": [],
     "matches": {},
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
   "strategy": "EXACT_MATCH",
   "partialCredit": false,
   "maxScore": 2
  }
 },
 {
  "_id": "b1000000-0000-4000-8000-000000000048",
  "questionSetId": "b1000000-0000-4000-8000-000000000048",
  "revision": 1,
  "schemaVersion": 1,
  "partId": "16000000-0000-4000-8000-000000000011",
  "taskTypeCode": "GAP_FILL_CHOICE",
  "title": "The children are ______ to me.",
  "instructions": "Chọn từ phù hợp để hoàn thành câu.",
  "accessLevel": "PREMIUM",
  "stimulus": null,
  "sections": [],
  "items": [
   {
    "id": "item_1",
    "sequenceNo": 1,
    "prompt": {
     "format": "PLAIN_TEXT",
     "value": "The children are ______ to me."
    },
    "responseType": "SINGLE_CHOICE",
    "required": true,
    "maxScore": 2,
    "options": [
     {
      "id": "A",
      "code": "A",
      "content": "noisy"
     },
     {
      "id": "B",
      "code": "B",
      "content": "shy"
     },
     {
      "id": "C",
      "code": "C",
      "content": "friendly"
     }
    ],
    "leftItems": [],
    "rightItems": [],
    "constraints": {},
    "answerKey": {
     "type": "SINGLE_CHOICE",
     "selectedOptionId": "C",
     "selectedOptionIds": [],
     "matches": {},
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
   "strategy": "EXACT_MATCH",
   "partialCredit": false,
   "maxScore": 2
  }
 },
 {
  "_id": "b1000000-0000-4000-8000-000000000049",
  "questionSetId": "b1000000-0000-4000-8000-000000000049",
  "revision": 1,
  "schemaVersion": 1,
  "partId": "16000000-0000-4000-8000-000000000011",
  "taskTypeCode": "GAP_FILL_CHOICE",
  "title": "This exercise is not difficult. It is quite ______.",
  "instructions": "Chọn từ phù hợp để hoàn thành câu.",
  "accessLevel": "PREMIUM",
  "stimulus": null,
  "sections": [],
  "items": [
   {
    "id": "item_1",
    "sequenceNo": 1,
    "prompt": {
     "format": "PLAIN_TEXT",
     "value": "This exercise is not difficult. It is quite ______."
    },
    "responseType": "SINGLE_CHOICE",
    "required": true,
    "maxScore": 2,
    "options": [
     {
      "id": "A",
      "code": "A",
      "content": "easy"
     },
     {
      "id": "B",
      "code": "B",
      "content": "angry"
     },
     {
      "id": "C",
      "code": "C",
      "content": "empty"
     }
    ],
    "leftItems": [],
    "rightItems": [],
    "constraints": {},
    "answerKey": {
     "type": "SINGLE_CHOICE",
     "selectedOptionId": "A",
     "selectedOptionIds": [],
     "matches": {},
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
   "strategy": "EXACT_MATCH",
   "partialCredit": false,
   "maxScore": 2
  }
 },
 {
  "_id": "b1000000-0000-4000-8000-000000000050",
  "questionSetId": "b1000000-0000-4000-8000-000000000050",
  "revision": 1,
  "schemaVersion": 1,
  "partId": "16000000-0000-4000-8000-000000000011",
  "taskTypeCode": "GAP_FILL_CHOICE",
  "title": "I feel ____ after cycling to work.",
  "instructions": "Chọn từ phù hợp để hoàn thành câu.",
  "accessLevel": "PREMIUM",
  "stimulus": null,
  "sections": [],
  "items": [
   {
    "id": "item_1",
    "sequenceNo": 1,
    "prompt": {
     "format": "PLAIN_TEXT",
     "value": "I feel ____ after cycling to work."
    },
    "responseType": "SINGLE_CHOICE",
    "required": true,
    "maxScore": 2,
    "options": [
     {
      "id": "A",
      "code": "A",
      "content": "big"
     },
     {
      "id": "B",
      "code": "B",
      "content": "good"
     },
     {
      "id": "C",
      "code": "C",
      "content": "beautiful"
     }
    ],
    "leftItems": [],
    "rightItems": [],
    "constraints": {},
    "answerKey": {
     "type": "SINGLE_CHOICE",
     "selectedOptionId": "B",
     "selectedOptionIds": [],
     "matches": {},
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
   "strategy": "EXACT_MATCH",
   "partialCredit": false,
   "maxScore": 2
  }
 },
 {
  "_id": "b1000000-0000-4000-8000-000000000051",
  "questionSetId": "b1000000-0000-4000-8000-000000000051",
  "revision": 1,
  "schemaVersion": 1,
  "partId": "16000000-0000-4000-8000-000000000011",
  "taskTypeCode": "GAP_FILL_CHOICE",
  "title": "I cook eggs for a quick ______.",
  "instructions": "Chọn từ phù hợp để hoàn thành câu.",
  "accessLevel": "PREMIUM",
  "stimulus": null,
  "sections": [],
  "items": [
   {
    "id": "item_1",
    "sequenceNo": 1,
    "prompt": {
     "format": "PLAIN_TEXT",
     "value": "I cook eggs for a quick ______."
    },
    "responseType": "SINGLE_CHOICE",
    "required": true,
    "maxScore": 2,
    "options": [
     {
      "id": "A",
      "code": "A",
      "content": "dinner"
     },
     {
      "id": "B",
      "code": "B",
      "content": "homework"
     },
     {
      "id": "C",
      "code": "C",
      "content": "sore"
     }
    ],
    "leftItems": [],
    "rightItems": [],
    "constraints": {},
    "answerKey": {
     "type": "SINGLE_CHOICE",
     "selectedOptionId": "A",
     "selectedOptionIds": [],
     "matches": {},
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
   "strategy": "EXACT_MATCH",
   "partialCredit": false,
   "maxScore": 2
  }
 },
 {
  "_id": "b1000000-0000-4000-8000-000000000052",
  "questionSetId": "b1000000-0000-4000-8000-000000000052",
  "revision": 1,
  "schemaVersion": 1,
  "partId": "16000000-0000-4000-8000-000000000011",
  "taskTypeCode": "GAP_FILL_CHOICE",
  "title": "I buy some food at the ______.",
  "instructions": "Chọn từ phù hợp để hoàn thành câu.",
  "accessLevel": "PREMIUM",
  "stimulus": null,
  "sections": [],
  "items": [
   {
    "id": "item_1",
    "sequenceNo": 1,
    "prompt": {
     "format": "PLAIN_TEXT",
     "value": "I buy some food at the ______."
    },
    "responseType": "SINGLE_CHOICE",
    "required": true,
    "maxScore": 2,
    "options": [
     {
      "id": "A",
      "code": "A",
      "content": "classroom"
     },
     {
      "id": "B",
      "code": "B",
      "content": "park"
     },
     {
      "id": "C",
      "code": "C",
      "content": "market"
     }
    ],
    "leftItems": [],
    "rightItems": [],
    "constraints": {},
    "answerKey": {
     "type": "SINGLE_CHOICE",
     "selectedOptionId": "C",
     "selectedOptionIds": [],
     "matches": {},
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
   "strategy": "EXACT_MATCH",
   "partialCredit": false,
   "maxScore": 2
  }
 },
 {
  "_id": "b1000000-0000-4000-8000-000000000053",
  "questionSetId": "b1000000-0000-4000-8000-000000000053",
  "revision": 1,
  "schemaVersion": 1,
  "partId": "16000000-0000-4000-8000-000000000011",
  "taskTypeCode": "GAP_FILL_CHOICE",
  "title": "Exercise is ____ for my body.",
  "instructions": "Chọn từ phù hợp để hoàn thành câu.",
  "accessLevel": "PREMIUM",
  "stimulus": null,
  "sections": [],
  "items": [
   {
    "id": "item_1",
    "sequenceNo": 1,
    "prompt": {
     "format": "PLAIN_TEXT",
     "value": "Exercise is ____ for my body."
    },
    "responseType": "SINGLE_CHOICE",
    "required": true,
    "maxScore": 2,
    "options": [
     {
      "id": "A",
      "code": "A",
      "content": "leave"
     },
     {
      "id": "B",
      "code": "B",
      "content": "good"
     },
     {
      "id": "C",
      "code": "C",
      "content": "early"
     }
    ],
    "leftItems": [],
    "rightItems": [],
    "constraints": {},
    "answerKey": {
     "type": "SINGLE_CHOICE",
     "selectedOptionId": "B",
     "selectedOptionIds": [],
     "matches": {},
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
   "strategy": "EXACT_MATCH",
   "partialCredit": false,
   "maxScore": 2
  }
 },
 {
  "_id": "b1000000-0000-4000-8000-000000000054",
  "questionSetId": "b1000000-0000-4000-8000-000000000054",
  "revision": 1,
  "schemaVersion": 1,
  "partId": "16000000-0000-4000-8000-000000000011",
  "taskTypeCode": "GAP_FILL_CHOICE",
  "title": "She is from France and she can ______ 5 languages.",
  "instructions": "Chọn từ phù hợp để hoàn thành câu.",
  "accessLevel": "PREMIUM",
  "stimulus": null,
  "sections": [],
  "items": [
   {
    "id": "item_1",
    "sequenceNo": 1,
    "prompt": {
     "format": "PLAIN_TEXT",
     "value": "She is from France and she can ______ 5 languages."
    },
    "responseType": "SINGLE_CHOICE",
    "required": true,
    "maxScore": 2,
    "options": [
     {
      "id": "A",
      "code": "A",
      "content": "talk"
     },
     {
      "id": "B",
      "code": "B",
      "content": "say"
     },
     {
      "id": "C",
      "code": "C",
      "content": "speak"
     }
    ],
    "leftItems": [],
    "rightItems": [],
    "constraints": {},
    "answerKey": {
     "type": "SINGLE_CHOICE",
     "selectedOptionId": "C",
     "selectedOptionIds": [],
     "matches": {},
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
   "strategy": "EXACT_MATCH",
   "partialCredit": false,
   "maxScore": 2
  }
 },
 {
  "_id": "b1000000-0000-4000-8000-000000000055",
  "questionSetId": "b1000000-0000-4000-8000-000000000055",
  "revision": 1,
  "schemaVersion": 1,
  "partId": "16000000-0000-4000-8000-000000000011",
  "taskTypeCode": "GAP_FILL_CHOICE",
  "title": "I go home in my new ______.",
  "instructions": "Chọn từ phù hợp để hoàn thành câu.",
  "accessLevel": "PREMIUM",
  "stimulus": null,
  "sections": [],
  "items": [
   {
    "id": "item_1",
    "sequenceNo": 1,
    "prompt": {
     "format": "PLAIN_TEXT",
     "value": "I go home in my new ______."
    },
    "responseType": "SINGLE_CHOICE",
    "required": true,
    "maxScore": 2,
    "options": [
     {
      "id": "A",
      "code": "A",
      "content": "bag"
     },
     {
      "id": "B",
      "code": "B",
      "content": "jeans"
     },
     {
      "id": "C",
      "code": "C",
      "content": "car"
     }
    ],
    "leftItems": [],
    "rightItems": [],
    "constraints": {},
    "answerKey": {
     "type": "SINGLE_CHOICE",
     "selectedOptionId": "C",
     "selectedOptionIds": [],
     "matches": {},
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
   "strategy": "EXACT_MATCH",
   "partialCredit": false,
   "maxScore": 2
  }
 },
 {
  "_id": "b1000000-0000-4000-8000-000000000056",
  "questionSetId": "b1000000-0000-4000-8000-000000000056",
  "revision": 1,
  "schemaVersion": 1,
  "partId": "16000000-0000-4000-8000-000000000011",
  "taskTypeCode": "GAP_FILL_CHOICE",
  "title": "I hope to ______ your letter",
  "instructions": "Chọn từ phù hợp để hoàn thành câu.",
  "accessLevel": "PREMIUM",
  "stimulus": null,
  "sections": [],
  "items": [
   {
    "id": "item_1",
    "sequenceNo": 1,
    "prompt": {
     "format": "PLAIN_TEXT",
     "value": "I hope to ______ your letter"
    },
    "responseType": "SINGLE_CHOICE",
    "required": true,
    "maxScore": 2,
    "options": [
     {
      "id": "A",
      "code": "A",
      "content": "tell"
     },
     {
      "id": "B",
      "code": "B",
      "content": "read"
     },
     {
      "id": "C",
      "code": "C",
      "content": "forward"
     }
    ],
    "leftItems": [],
    "rightItems": [],
    "constraints": {},
    "answerKey": {
     "type": "SINGLE_CHOICE",
     "selectedOptionId": "B",
     "selectedOptionIds": [],
     "matches": {},
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
   "strategy": "EXACT_MATCH",
   "partialCredit": false,
   "maxScore": 2
  }
 },
 {
  "_id": "b1000000-0000-4000-8000-000000000057",
  "questionSetId": "b1000000-0000-4000-8000-000000000057",
  "revision": 1,
  "schemaVersion": 1,
  "partId": "16000000-0000-4000-8000-000000000011",
  "taskTypeCode": "GAP_FILL_CHOICE",
  "title": "I can ______ you at your place then.",
  "instructions": "Chọn từ phù hợp để hoàn thành câu.",
  "accessLevel": "PREMIUM",
  "stimulus": null,
  "sections": [],
  "items": [
   {
    "id": "item_1",
    "sequenceNo": 1,
    "prompt": {
     "format": "PLAIN_TEXT",
     "value": "I can ______ you at your place then."
    },
    "responseType": "SINGLE_CHOICE",
    "required": true,
    "maxScore": 2,
    "options": [
     {
      "id": "A",
      "code": "A",
      "content": "hold"
     },
     {
      "id": "B",
      "code": "B",
      "content": "meet"
     },
     {
      "id": "C",
      "code": "C",
      "content": "miss"
     }
    ],
    "leftItems": [],
    "rightItems": [],
    "constraints": {},
    "answerKey": {
     "type": "SINGLE_CHOICE",
     "selectedOptionId": "B",
     "selectedOptionIds": [],
     "matches": {},
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
   "strategy": "EXACT_MATCH",
   "partialCredit": false,
   "maxScore": 2
  }
 },
 {
  "_id": "b1000000-0000-4000-8000-000000000058",
  "questionSetId": "b1000000-0000-4000-8000-000000000058",
  "revision": 1,
  "schemaVersion": 1,
  "partId": "16000000-0000-4000-8000-000000000011",
  "taskTypeCode": "GAP_FILL_CHOICE",
  "title": "Please read the information ______ so we don't miss any details.",
  "instructions": "Chọn từ phù hợp để hoàn thành câu.",
  "accessLevel": "PREMIUM",
  "stimulus": null,
  "sections": [],
  "items": [
   {
    "id": "item_1",
    "sequenceNo": 1,
    "prompt": {
     "format": "PLAIN_TEXT",
     "value": "Please read the information ______ so we don't miss any details."
    },
    "responseType": "SINGLE_CHOICE",
    "required": true,
    "maxScore": 2,
    "options": [
     {
      "id": "A",
      "code": "A",
      "content": "beautifully"
     },
     {
      "id": "B",
      "code": "B",
      "content": "fluently"
     },
     {
      "id": "C",
      "code": "C",
      "content": "slowly"
     }
    ],
    "leftItems": [],
    "rightItems": [],
    "constraints": {},
    "answerKey": {
     "type": "SINGLE_CHOICE",
     "selectedOptionId": "C",
     "selectedOptionIds": [],
     "matches": {},
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
   "strategy": "EXACT_MATCH",
   "partialCredit": false,
   "maxScore": 2
  }
 },
 {
  "_id": "b1000000-0000-4000-8000-000000000059",
  "questionSetId": "b1000000-0000-4000-8000-000000000059",
  "revision": 1,
  "schemaVersion": 1,
  "partId": "16000000-0000-4000-8000-000000000011",
  "taskTypeCode": "GAP_FILL_CHOICE",
  "title": "I will save you ______ cake.",
  "instructions": "Chọn từ phù hợp để hoàn thành câu.",
  "accessLevel": "PREMIUM",
  "stimulus": null,
  "sections": [],
  "items": [
   {
    "id": "item_1",
    "sequenceNo": 1,
    "prompt": {
     "format": "PLAIN_TEXT",
     "value": "I will save you ______ cake."
    },
    "responseType": "SINGLE_CHOICE",
    "required": true,
    "maxScore": 2,
    "options": [
     {
      "id": "A",
      "code": "A",
      "content": "many"
     },
     {
      "id": "B",
      "code": "B",
      "content": "none"
     },
     {
      "id": "C",
      "code": "C",
      "content": "some"
     }
    ],
    "leftItems": [],
    "rightItems": [],
    "constraints": {},
    "answerKey": {
     "type": "SINGLE_CHOICE",
     "selectedOptionId": "C",
     "selectedOptionIds": [],
     "matches": {},
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
   "strategy": "EXACT_MATCH",
   "partialCredit": false,
   "maxScore": 2
  }
 },
 {
  "_id": "b1000000-0000-4000-8000-000000000060",
  "questionSetId": "b1000000-0000-4000-8000-000000000060",
  "revision": 1,
  "schemaVersion": 1,
  "partId": "16000000-0000-4000-8000-000000000011",
  "taskTypeCode": "GAP_FILL_CHOICE",
  "title": "I always ______ dinner for myself.",
  "instructions": "Chọn từ phù hợp để hoàn thành câu.",
  "accessLevel": "PREMIUM",
  "stimulus": null,
  "sections": [],
  "items": [
   {
    "id": "item_1",
    "sequenceNo": 1,
    "prompt": {
     "format": "PLAIN_TEXT",
     "value": "I always ______ dinner for myself."
    },
    "responseType": "SINGLE_CHOICE",
    "required": true,
    "maxScore": 2,
    "options": [
     {
      "id": "A",
      "code": "A",
      "content": "cook"
     },
     {
      "id": "B",
      "code": "B",
      "content": "drink"
     },
     {
      "id": "C",
      "code": "C",
      "content": "breathe"
     }
    ],
    "leftItems": [],
    "rightItems": [],
    "constraints": {},
    "answerKey": {
     "type": "SINGLE_CHOICE",
     "selectedOptionId": "A",
     "selectedOptionIds": [],
     "matches": {},
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
   "strategy": "EXACT_MATCH",
   "partialCredit": false,
   "maxScore": 2
  }
 },
 {
  "_id": "b1000000-0000-4000-8000-000000000061",
  "questionSetId": "b1000000-0000-4000-8000-000000000061",
  "revision": 1,
  "schemaVersion": 1,
  "partId": "16000000-0000-4000-8000-000000000011",
  "taskTypeCode": "GAP_FILL_CHOICE",
  "title": "We are going to ______ around.",
  "instructions": "Chọn từ phù hợp để hoàn thành câu.",
  "accessLevel": "PREMIUM",
  "stimulus": null,
  "sections": [],
  "items": [
   {
    "id": "item_1",
    "sequenceNo": 1,
    "prompt": {
     "format": "PLAIN_TEXT",
     "value": "We are going to ______ around."
    },
    "responseType": "SINGLE_CHOICE",
    "required": true,
    "maxScore": 2,
    "options": [
     {
      "id": "A",
      "code": "A",
      "content": "drive"
     },
     {
      "id": "B",
      "code": "B",
      "content": "see"
     },
     {
      "id": "C",
      "code": "C",
      "content": "talk"
     }
    ],
    "leftItems": [],
    "rightItems": [],
    "constraints": {},
    "answerKey": {
     "type": "SINGLE_CHOICE",
     "selectedOptionId": "A",
     "selectedOptionIds": [],
     "matches": {},
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
   "strategy": "EXACT_MATCH",
   "partialCredit": false,
   "maxScore": 2
  }
 },
 {
  "_id": "b1000000-0000-4000-8000-000000000062",
  "questionSetId": "b1000000-0000-4000-8000-000000000062",
  "revision": 1,
  "schemaVersion": 1,
  "partId": "16000000-0000-4000-8000-000000000011",
  "taskTypeCode": "GAP_FILL_CHOICE",
  "title": "I will have meetings with my ______.",
  "instructions": "Chọn từ phù hợp để hoàn thành câu.",
  "accessLevel": "PREMIUM",
  "stimulus": null,
  "sections": [],
  "items": [
   {
    "id": "item_1",
    "sequenceNo": 1,
    "prompt": {
     "format": "PLAIN_TEXT",
     "value": "I will have meetings with my ______."
    },
    "responseType": "SINGLE_CHOICE",
    "required": true,
    "maxScore": 2,
    "options": [
     {
      "id": "A",
      "code": "A",
      "content": "neighbor"
     },
     {
      "id": "B",
      "code": "B",
      "content": "wife"
     },
     {
      "id": "C",
      "code": "C",
      "content": "client"
     }
    ],
    "leftItems": [],
    "rightItems": [],
    "constraints": {},
    "answerKey": {
     "type": "SINGLE_CHOICE",
     "selectedOptionId": "C",
     "selectedOptionIds": [],
     "matches": {},
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
   "strategy": "EXACT_MATCH",
   "partialCredit": false,
   "maxScore": 2
  }
 },
 {
  "_id": "b1000000-0000-4000-8000-000000000063",
  "questionSetId": "b1000000-0000-4000-8000-000000000063",
  "revision": 1,
  "schemaVersion": 1,
  "partId": "16000000-0000-4000-8000-000000000011",
  "taskTypeCode": "GAP_FILL_CHOICE",
  "title": "We ______ to work.",
  "instructions": "Chọn từ phù hợp để hoàn thành câu.",
  "accessLevel": "PREMIUM",
  "stimulus": null,
  "sections": [],
  "items": [
   {
    "id": "item_1",
    "sequenceNo": 1,
    "prompt": {
     "format": "PLAIN_TEXT",
     "value": "We ______ to work."
    },
    "responseType": "SINGLE_CHOICE",
    "required": true,
    "maxScore": 2,
    "options": [
     {
      "id": "A",
      "code": "A",
      "content": "drive"
     },
     {
      "id": "B",
      "code": "B",
      "content": "smile"
     },
     {
      "id": "C",
      "code": "C",
      "content": "say"
     }
    ],
    "leftItems": [],
    "rightItems": [],
    "constraints": {},
    "answerKey": {
     "type": "SINGLE_CHOICE",
     "selectedOptionId": "A",
     "selectedOptionIds": [],
     "matches": {},
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
   "strategy": "EXACT_MATCH",
   "partialCredit": false,
   "maxScore": 2
  }
 },
 {
  "_id": "b1000000-0000-4000-8000-000000000064",
  "questionSetId": "b1000000-0000-4000-8000-000000000064",
  "revision": 1,
  "schemaVersion": 1,
  "partId": "16000000-0000-4000-8000-000000000011",
  "taskTypeCode": "GAP_FILL_CHOICE",
  "title": "After ______ so hard.",
  "instructions": "Chọn từ phù hợp để hoàn thành câu.",
  "accessLevel": "PREMIUM",
  "stimulus": null,
  "sections": [],
  "items": [
   {
    "id": "item_1",
    "sequenceNo": 1,
    "prompt": {
     "format": "PLAIN_TEXT",
     "value": "After ______ so hard."
    },
    "responseType": "SINGLE_CHOICE",
    "required": true,
    "maxScore": 2,
    "options": [
     {
      "id": "A",
      "code": "A",
      "content": "working"
     },
     {
      "id": "B",
      "code": "B",
      "content": "sleeping"
     },
     {
      "id": "C",
      "code": "C",
      "content": "eating"
     }
    ],
    "leftItems": [],
    "rightItems": [],
    "constraints": {},
    "answerKey": {
     "type": "SINGLE_CHOICE",
     "selectedOptionId": "A",
     "selectedOptionIds": [],
     "matches": {},
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
   "strategy": "EXACT_MATCH",
   "partialCredit": false,
   "maxScore": 2
  }
 },
 {
  "_id": "b1000000-0000-4000-8000-000000000065",
  "questionSetId": "b1000000-0000-4000-8000-000000000065",
  "revision": 1,
  "schemaVersion": 1,
  "partId": "16000000-0000-4000-8000-000000000011",
  "taskTypeCode": "GAP_FILL_CHOICE",
  "title": "Seamus and Agnes ______ speaking English with me.",
  "instructions": "Chọn từ phù hợp để hoàn thành câu.",
  "accessLevel": "PREMIUM",
  "stimulus": null,
  "sections": [],
  "items": [
   {
    "id": "item_1",
    "sequenceNo": 1,
    "prompt": {
     "format": "PLAIN_TEXT",
     "value": "Seamus and Agnes ______ speaking English with me."
    },
    "responseType": "SINGLE_CHOICE",
    "required": true,
    "maxScore": 2,
    "options": [
     {
      "id": "A",
      "code": "A",
      "content": "practise"
     },
     {
      "id": "B",
      "code": "B",
      "content": "forget"
     },
     {
      "id": "C",
      "code": "C",
      "content": "avoid"
     }
    ],
    "leftItems": [],
    "rightItems": [],
    "constraints": {},
    "answerKey": {
     "type": "SINGLE_CHOICE",
     "selectedOptionId": "A",
     "selectedOptionIds": [],
     "matches": {},
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
   "strategy": "EXACT_MATCH",
   "partialCredit": false,
   "maxScore": 2
  }
 },
 {
  "_id": "b1000000-0000-4000-8000-000000000066",
  "questionSetId": "b1000000-0000-4000-8000-000000000066",
  "revision": 1,
  "schemaVersion": 1,
  "partId": "16000000-0000-4000-8000-000000000011",
  "taskTypeCode": "GAP_FILL_CHOICE",
  "title": "We arrived early, ______ we had time for a coffee.",
  "instructions": "Chọn từ phù hợp để hoàn thành câu.",
  "accessLevel": "PREMIUM",
  "stimulus": null,
  "sections": [],
  "items": [
   {
    "id": "item_1",
    "sequenceNo": 1,
    "prompt": {
     "format": "PLAIN_TEXT",
     "value": "We arrived early, ______ we had time for a coffee."
    },
    "responseType": "SINGLE_CHOICE",
    "required": true,
    "maxScore": 2,
    "options": [
     {
      "id": "A",
      "code": "A",
      "content": "so"
     },
     {
      "id": "B",
      "code": "B",
      "content": "but"
     },
     {
      "id": "C",
      "code": "C",
      "content": "if"
     }
    ],
    "leftItems": [],
    "rightItems": [],
    "constraints": {},
    "answerKey": {
     "type": "SINGLE_CHOICE",
     "selectedOptionId": "A",
     "selectedOptionIds": [],
     "matches": {},
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
   "strategy": "EXACT_MATCH",
   "partialCredit": false,
   "maxScore": 2
  }
 },
 {
  "_id": "b1000000-0000-4000-8000-000000000067",
  "questionSetId": "b1000000-0000-4000-8000-000000000067",
  "revision": 1,
  "schemaVersion": 1,
  "partId": "16000000-0000-4000-8000-000000000011",
  "taskTypeCode": "GAP_FILL_CHOICE",
  "title": "When you are at the train ____, go to the main gate.",
  "instructions": "Chọn từ phù hợp để hoàn thành câu.",
  "accessLevel": "PREMIUM",
  "stimulus": null,
  "sections": [],
  "items": [
   {
    "id": "item_1",
    "sequenceNo": 1,
    "prompt": {
     "format": "PLAIN_TEXT",
     "value": "When you are at the train ____, go to the main gate."
    },
    "responseType": "SINGLE_CHOICE",
    "required": true,
    "maxScore": 2,
    "options": [
     {
      "id": "A",
      "code": "A",
      "content": "school"
     },
     {
      "id": "B",
      "code": "B",
      "content": "station"
     },
     {
      "id": "C",
      "code": "C",
      "content": "river"
     }
    ],
    "leftItems": [],
    "rightItems": [],
    "constraints": {},
    "answerKey": {
     "type": "SINGLE_CHOICE",
     "selectedOptionId": "B",
     "selectedOptionIds": [],
     "matches": {},
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
   "strategy": "EXACT_MATCH",
   "partialCredit": false,
   "maxScore": 2
  }
 },
 {
  "_id": "b1000000-0000-4000-8000-000000000068",
  "questionSetId": "b1000000-0000-4000-8000-000000000068",
  "revision": 1,
  "schemaVersion": 1,
  "partId": "16000000-0000-4000-8000-000000000011",
  "taskTypeCode": "GAP_FILL_CHOICE",
  "title": "After dinner, we will watch ______ on TV.",
  "instructions": "Chọn từ phù hợp để hoàn thành câu.",
  "accessLevel": "PREMIUM",
  "stimulus": null,
  "sections": [],
  "items": [
   {
    "id": "item_1",
    "sequenceNo": 1,
    "prompt": {
     "format": "PLAIN_TEXT",
     "value": "After dinner, we will watch ______ on TV."
    },
    "responseType": "SINGLE_CHOICE",
    "required": true,
    "maxScore": 2,
    "options": [
     {
      "id": "A",
      "code": "A",
      "content": "sing"
     },
     {
      "id": "B",
      "code": "B",
      "content": "movies"
     },
     {
      "id": "C",
      "code": "C",
      "content": "news"
     }
    ],
    "leftItems": [],
    "rightItems": [],
    "constraints": {},
    "answerKey": {
     "type": "SINGLE_CHOICE",
     "selectedOptionId": "B",
     "selectedOptionIds": [],
     "matches": {},
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
   "strategy": "EXACT_MATCH",
   "partialCredit": false,
   "maxScore": 2
  }
 },
 {
  "_id": "b1000000-0000-4000-8000-000000000069",
  "questionSetId": "b1000000-0000-4000-8000-000000000069",
  "revision": 1,
  "schemaVersion": 1,
  "partId": "16000000-0000-4000-8000-000000000011",
  "taskTypeCode": "GAP_FILL_CHOICE",
  "title": "I ate ______.",
  "instructions": "Chọn từ phù hợp để hoàn thành câu.",
  "accessLevel": "PREMIUM",
  "stimulus": null,
  "sections": [],
  "items": [
   {
    "id": "item_1",
    "sequenceNo": 1,
    "prompt": {
     "format": "PLAIN_TEXT",
     "value": "I ate ______."
    },
    "responseType": "SINGLE_CHOICE",
    "required": true,
    "maxScore": 2,
    "options": [
     {
      "id": "A",
      "code": "A",
      "content": "watch"
     },
     {
      "id": "B",
      "code": "B",
      "content": "door"
     },
     {
      "id": "C",
      "code": "C",
      "content": "cake"
     }
    ],
    "leftItems": [],
    "rightItems": [],
    "constraints": {},
    "answerKey": {
     "type": "SINGLE_CHOICE",
     "selectedOptionId": "C",
     "selectedOptionIds": [],
     "matches": {},
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
   "strategy": "EXACT_MATCH",
   "partialCredit": false,
   "maxScore": 2
  }
 },
 {
  "_id": "b1000000-0000-4000-8000-000000000070",
  "questionSetId": "b1000000-0000-4000-8000-000000000070",
  "revision": 1,
  "schemaVersion": 1,
  "partId": "16000000-0000-4000-8000-000000000011",
  "taskTypeCode": "GAP_FILL_CHOICE",
  "title": "I hate the food, ______ yesterday I ate out.",
  "instructions": "Chọn từ phù hợp để hoàn thành câu.",
  "accessLevel": "PREMIUM",
  "stimulus": null,
  "sections": [],
  "items": [
   {
    "id": "item_1",
    "sequenceNo": 1,
    "prompt": {
     "format": "PLAIN_TEXT",
     "value": "I hate the food, ______ yesterday I ate out."
    },
    "responseType": "SINGLE_CHOICE",
    "required": true,
    "maxScore": 2,
    "options": [
     {
      "id": "A",
      "code": "A",
      "content": "then"
     },
     {
      "id": "B",
      "code": "B",
      "content": "so"
     },
     {
      "id": "C",
      "code": "C",
      "content": "also"
     }
    ],
    "leftItems": [],
    "rightItems": [],
    "constraints": {},
    "answerKey": {
     "type": "SINGLE_CHOICE",
     "selectedOptionId": "B",
     "selectedOptionIds": [],
     "matches": {},
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
   "strategy": "EXACT_MATCH",
   "partialCredit": false,
   "maxScore": 2
  }
 },
 {
  "_id": "b1000000-0000-4000-8000-000000000071",
  "questionSetId": "b1000000-0000-4000-8000-000000000071",
  "revision": 1,
  "schemaVersion": 1,
  "partId": "16000000-0000-4000-8000-000000000011",
  "taskTypeCode": "GAP_FILL_CHOICE",
  "title": "I usually drink a lot of water and eat healthy ____.",
  "instructions": "Chọn từ phù hợp để hoàn thành câu.",
  "accessLevel": "PREMIUM",
  "stimulus": null,
  "sections": [],
  "items": [
   {
    "id": "item_1",
    "sequenceNo": 1,
    "prompt": {
     "format": "PLAIN_TEXT",
     "value": "I usually drink a lot of water and eat healthy ____."
    },
    "responseType": "SINGLE_CHOICE",
    "required": true,
    "maxScore": 2,
    "options": [
     {
      "id": "A",
      "code": "A",
      "content": "watch"
     },
     {
      "id": "B",
      "code": "B",
      "content": "meal"
     },
     {
      "id": "C",
      "code": "C",
      "content": "food"
     }
    ],
    "leftItems": [],
    "rightItems": [],
    "constraints": {},
    "answerKey": {
     "type": "SINGLE_CHOICE",
     "selectedOptionId": "C",
     "selectedOptionIds": [],
     "matches": {},
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
   "strategy": "EXACT_MATCH",
   "partialCredit": false,
   "maxScore": 2
  }
 },
 {
  "_id": "b1000000-0000-4000-8000-000000000072",
  "questionSetId": "b1000000-0000-4000-8000-000000000072",
  "revision": 1,
  "schemaVersion": 1,
  "partId": "16000000-0000-4000-8000-000000000011",
  "taskTypeCode": "GAP_FILL_CHOICE",
  "title": "We eat dinner ______. Love,",
  "instructions": "Chọn từ phù hợp để hoàn thành câu.",
  "accessLevel": "PREMIUM",
  "stimulus": null,
  "sections": [],
  "items": [
   {
    "id": "item_1",
    "sequenceNo": 1,
    "prompt": {
     "format": "PLAIN_TEXT",
     "value": "We eat dinner ______. Love,"
    },
    "responseType": "SINGLE_CHOICE",
    "required": true,
    "maxScore": 2,
    "options": [
     {
      "id": "A",
      "code": "A",
      "content": "toward"
     },
     {
      "id": "B",
      "code": "B",
      "content": "together"
     },
     {
      "id": "C",
      "code": "C",
      "content": "another"
     }
    ],
    "leftItems": [],
    "rightItems": [],
    "constraints": {},
    "answerKey": {
     "type": "SINGLE_CHOICE",
     "selectedOptionId": "B",
     "selectedOptionIds": [],
     "matches": {},
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
   "strategy": "EXACT_MATCH",
   "partialCredit": false,
   "maxScore": 2
  }
 },
 {
  "_id": "b1000000-0000-4000-8000-000000000073",
  "questionSetId": "b1000000-0000-4000-8000-000000000073",
  "revision": 1,
  "schemaVersion": 1,
  "partId": "16000000-0000-4000-8000-000000000011",
  "taskTypeCode": "GAP_FILL_CHOICE",
  "title": "I go to bed when I feel ______.",
  "instructions": "Chọn từ phù hợp để hoàn thành câu.",
  "accessLevel": "PREMIUM",
  "stimulus": null,
  "sections": [],
  "items": [
   {
    "id": "item_1",
    "sequenceNo": 1,
    "prompt": {
     "format": "PLAIN_TEXT",
     "value": "I go to bed when I feel ______."
    },
    "responseType": "SINGLE_CHOICE",
    "required": true,
    "maxScore": 2,
    "options": [
     {
      "id": "A",
      "code": "A",
      "content": "sleepy"
     },
     {
      "id": "B",
      "code": "B",
      "content": "angry"
     },
     {
      "id": "C",
      "code": "C",
      "content": "alert"
     }
    ],
    "leftItems": [],
    "rightItems": [],
    "constraints": {},
    "answerKey": {
     "type": "SINGLE_CHOICE",
     "selectedOptionId": "A",
     "selectedOptionIds": [],
     "matches": {},
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
   "strategy": "EXACT_MATCH",
   "partialCredit": false,
   "maxScore": 2
  }
 },
 {
  "_id": "b1000000-0000-4000-8000-000000000074",
  "questionSetId": "b1000000-0000-4000-8000-000000000074",
  "revision": 1,
  "schemaVersion": 1,
  "partId": "16000000-0000-4000-8000-000000000011",
  "taskTypeCode": "GAP_FILL_CHOICE",
  "title": "Don't have too much ______ because we're going to eat cake.",
  "instructions": "Chọn từ phù hợp để hoàn thành câu.",
  "accessLevel": "PREMIUM",
  "stimulus": null,
  "sections": [],
  "items": [
   {
    "id": "item_1",
    "sequenceNo": 1,
    "prompt": {
     "format": "PLAIN_TEXT",
     "value": "Don't have too much ______ because we're going to eat cake."
    },
    "responseType": "SINGLE_CHOICE",
    "required": true,
    "maxScore": 2,
    "options": [
     {
      "id": "A",
      "code": "A",
      "content": "talk"
     },
     {
      "id": "B",
      "code": "B",
      "content": "pencil"
     },
     {
      "id": "C",
      "code": "C",
      "content": "dinner"
     }
    ],
    "leftItems": [],
    "rightItems": [],
    "constraints": {},
    "answerKey": {
     "type": "SINGLE_CHOICE",
     "selectedOptionId": "C",
     "selectedOptionIds": [],
     "matches": {},
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
   "strategy": "EXACT_MATCH",
   "partialCredit": false,
   "maxScore": 2
  }
 },
 {
  "_id": "b1000000-0000-4000-8000-000000000075",
  "questionSetId": "b1000000-0000-4000-8000-000000000075",
  "revision": 1,
  "schemaVersion": 1,
  "partId": "16000000-0000-4000-8000-000000000011",
  "taskTypeCode": "GAP_FILL_CHOICE",
  "title": "______ My love to everyone.",
  "instructions": "Chọn từ phù hợp để hoàn thành câu.",
  "accessLevel": "PREMIUM",
  "stimulus": null,
  "sections": [],
  "items": [
   {
    "id": "item_1",
    "sequenceNo": 1,
    "prompt": {
     "format": "PLAIN_TEXT",
     "value": "______ My love to everyone."
    },
    "responseType": "SINGLE_CHOICE",
    "required": true,
    "maxScore": 2,
    "options": [
     {
      "id": "A",
      "code": "A",
      "content": "Give"
     },
     {
      "id": "B",
      "code": "B",
      "content": "Hold"
     },
     {
      "id": "C",
      "code": "C",
      "content": "Receive"
     }
    ],
    "leftItems": [],
    "rightItems": [],
    "constraints": {},
    "answerKey": {
     "type": "SINGLE_CHOICE",
     "selectedOptionId": "A",
     "selectedOptionIds": [],
     "matches": {},
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
   "strategy": "EXACT_MATCH",
   "partialCredit": false,
   "maxScore": 2
  }
 },
 {
  "_id": "b1000000-0000-4000-8000-000000000076",
  "questionSetId": "b1000000-0000-4000-8000-000000000076",
  "revision": 1,
  "schemaVersion": 1,
  "partId": "16000000-0000-4000-8000-000000000011",
  "taskTypeCode": "GAP_FILL_CHOICE",
  "title": "It is a ______ day.",
  "instructions": "Chọn từ phù hợp để hoàn thành câu.",
  "accessLevel": "PREMIUM",
  "stimulus": null,
  "sections": [],
  "items": [
   {
    "id": "item_1",
    "sequenceNo": 1,
    "prompt": {
     "format": "PLAIN_TEXT",
     "value": "It is a ______ day."
    },
    "responseType": "SINGLE_CHOICE",
    "required": true,
    "maxScore": 2,
    "options": [
     {
      "id": "A",
      "code": "A",
      "content": "long"
     },
     {
      "id": "B",
      "code": "B",
      "content": "details"
     },
     {
      "id": "C",
      "code": "C",
      "content": "copy"
     }
    ],
    "leftItems": [],
    "rightItems": [],
    "constraints": {},
    "answerKey": {
     "type": "SINGLE_CHOICE",
     "selectedOptionId": "A",
     "selectedOptionIds": [],
     "matches": {},
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
   "strategy": "EXACT_MATCH",
   "partialCredit": false,
   "maxScore": 2
  }
 },
 {
  "_id": "b1000000-0000-4000-8000-000000000077",
  "questionSetId": "b1000000-0000-4000-8000-000000000077",
  "revision": 1,
  "schemaVersion": 1,
  "partId": "16000000-0000-4000-8000-000000000011",
  "taskTypeCode": "GAP_FILL_CHOICE",
  "title": "We like to ______ dinner.",
  "instructions": "Chọn từ phù hợp để hoàn thành câu.",
  "accessLevel": "PREMIUM",
  "stimulus": null,
  "sections": [],
  "items": [
   {
    "id": "item_1",
    "sequenceNo": 1,
    "prompt": {
     "format": "PLAIN_TEXT",
     "value": "We like to ______ dinner."
    },
    "responseType": "SINGLE_CHOICE",
    "required": true,
    "maxScore": 2,
    "options": [
     {
      "id": "A",
      "code": "A",
      "content": "hold"
     },
     {
      "id": "B",
      "code": "B",
      "content": "cook"
     },
     {
      "id": "C",
      "code": "C",
      "content": "melt"
     }
    ],
    "leftItems": [],
    "rightItems": [],
    "constraints": {},
    "answerKey": {
     "type": "SINGLE_CHOICE",
     "selectedOptionId": "B",
     "selectedOptionIds": [],
     "matches": {},
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
   "strategy": "EXACT_MATCH",
   "partialCredit": false,
   "maxScore": 2
  }
 },
 {
  "_id": "b1000000-0000-4000-8000-000000000078",
  "questionSetId": "b1000000-0000-4000-8000-000000000078",
  "revision": 1,
  "schemaVersion": 1,
  "partId": "16000000-0000-4000-8000-000000000011",
  "taskTypeCode": "GAP_FILL_CHOICE",
  "title": "We eat dinner ______.",
  "instructions": "Chọn từ phù hợp để hoàn thành câu.",
  "accessLevel": "PREMIUM",
  "stimulus": null,
  "sections": [],
  "items": [
   {
    "id": "item_1",
    "sequenceNo": 1,
    "prompt": {
     "format": "PLAIN_TEXT",
     "value": "We eat dinner ______."
    },
    "responseType": "SINGLE_CHOICE",
    "required": true,
    "maxScore": 2,
    "options": [
     {
      "id": "A",
      "code": "A",
      "content": "toward"
     },
     {
      "id": "B",
      "code": "B",
      "content": "together"
     },
     {
      "id": "C",
      "code": "C",
      "content": "another"
     }
    ],
    "leftItems": [],
    "rightItems": [],
    "constraints": {},
    "answerKey": {
     "type": "SINGLE_CHOICE",
     "selectedOptionId": "B",
     "selectedOptionIds": [],
     "matches": {},
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
   "strategy": "EXACT_MATCH",
   "partialCredit": false,
   "maxScore": 2
  }
 },
 {
  "_id": "b1000000-0000-4000-8000-000000000079",
  "questionSetId": "b1000000-0000-4000-8000-000000000079",
  "revision": 1,
  "schemaVersion": 1,
  "partId": "16000000-0000-4000-8000-000000000011",
  "taskTypeCode": "GAP_FILL_CHOICE",
  "title": "Also, send me the results ______ you go home, not after.",
  "instructions": "Chọn từ phù hợp để hoàn thành câu.",
  "accessLevel": "PREMIUM",
  "stimulus": null,
  "sections": [],
  "items": [
   {
    "id": "item_1",
    "sequenceNo": 1,
    "prompt": {
     "format": "PLAIN_TEXT",
     "value": "Also, send me the results ______ you go home, not after."
    },
    "responseType": "SINGLE_CHOICE",
    "required": true,
    "maxScore": 2,
    "options": [
     {
      "id": "A",
      "code": "A",
      "content": "when"
     },
     {
      "id": "B",
      "code": "B",
      "content": "before"
     },
     {
      "id": "C",
      "code": "C",
      "content": "between"
     }
    ],
    "leftItems": [],
    "rightItems": [],
    "constraints": {},
    "answerKey": {
     "type": "SINGLE_CHOICE",
     "selectedOptionId": "B",
     "selectedOptionIds": [],
     "matches": {},
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
   "strategy": "EXACT_MATCH",
   "partialCredit": false,
   "maxScore": 2
  }
 },
 {
  "_id": "b1000000-0000-4000-8000-000000000080",
  "questionSetId": "b1000000-0000-4000-8000-000000000080",
  "revision": 1,
  "schemaVersion": 1,
  "partId": "16000000-0000-4000-8000-000000000011",
  "taskTypeCode": "GAP_FILL_CHOICE",
  "title": "I do not like the food here, ______ yesterday I ate out.",
  "instructions": "Chọn từ phù hợp để hoàn thành câu.",
  "accessLevel": "PREMIUM",
  "stimulus": null,
  "sections": [],
  "items": [
   {
    "id": "item_1",
    "sequenceNo": 1,
    "prompt": {
     "format": "PLAIN_TEXT",
     "value": "I do not like the food here, ______ yesterday I ate out."
    },
    "responseType": "SINGLE_CHOICE",
    "required": true,
    "maxScore": 2,
    "options": [
     {
      "id": "A",
      "code": "A",
      "content": "so"
     },
     {
      "id": "B",
      "code": "B",
      "content": "but"
     },
     {
      "id": "C",
      "code": "C",
      "content": "unless"
     }
    ],
    "leftItems": [],
    "rightItems": [],
    "constraints": {},
    "answerKey": {
     "type": "SINGLE_CHOICE",
     "selectedOptionId": "A",
     "selectedOptionIds": [],
     "matches": {},
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
   "strategy": "EXACT_MATCH",
   "partialCredit": false,
   "maxScore": 2
  }
 },
 {
  "_id": "b1000000-0000-4000-8000-000000000081",
  "questionSetId": "b1000000-0000-4000-8000-000000000081",
  "revision": 1,
  "schemaVersion": 1,
  "partId": "16000000-0000-4000-8000-000000000011",
  "taskTypeCode": "GAP_FILL_CHOICE",
  "title": "Please write your name at the top of the ______.",
  "instructions": "Chọn từ phù hợp để hoàn thành câu.",
  "accessLevel": "PREMIUM",
  "stimulus": null,
  "sections": [],
  "items": [
   {
    "id": "item_1",
    "sequenceNo": 1,
    "prompt": {
     "format": "PLAIN_TEXT",
     "value": "Please write your name at the top of the ______."
    },
    "responseType": "SINGLE_CHOICE",
    "required": true,
    "maxScore": 2,
    "options": [
     {
      "id": "A",
      "code": "A",
      "content": "page"
     },
     {
      "id": "B",
      "code": "B",
      "content": "window"
     },
     {
      "id": "C",
      "code": "C",
      "content": "garden"
     }
    ],
    "leftItems": [],
    "rightItems": [],
    "constraints": {},
    "answerKey": {
     "type": "SINGLE_CHOICE",
     "selectedOptionId": "A",
     "selectedOptionIds": [],
     "matches": {},
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
   "strategy": "EXACT_MATCH",
   "partialCredit": false,
   "maxScore": 2
  }
 },
 {
  "_id": "b1000000-0000-4000-8000-000000000082",
  "questionSetId": "b1000000-0000-4000-8000-000000000082",
  "revision": 1,
  "schemaVersion": 1,
  "partId": "16000000-0000-4000-8000-000000000011",
  "taskTypeCode": "GAP_FILL_CHOICE",
  "title": "After you come, we will have ____.",
  "instructions": "Chọn từ phù hợp để hoàn thành câu.",
  "accessLevel": "PREMIUM",
  "stimulus": null,
  "sections": [],
  "items": [
   {
    "id": "item_1",
    "sequenceNo": 1,
    "prompt": {
     "format": "PLAIN_TEXT",
     "value": "After you come, we will have ____."
    },
    "responseType": "SINGLE_CHOICE",
    "required": true,
    "maxScore": 2,
    "options": [
     {
      "id": "A",
      "code": "A",
      "content": "dinner"
     },
     {
      "id": "B",
      "code": "B",
      "content": "food"
     },
     {
      "id": "C",
      "code": "C",
      "content": "eat"
     }
    ],
    "leftItems": [],
    "rightItems": [],
    "constraints": {},
    "answerKey": {
     "type": "SINGLE_CHOICE",
     "selectedOptionId": "A",
     "selectedOptionIds": [],
     "matches": {},
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
   "strategy": "EXACT_MATCH",
   "partialCredit": false,
   "maxScore": 2
  }
 },
 {
  "_id": "b1000000-0000-4000-8000-000000000083",
  "questionSetId": "b1000000-0000-4000-8000-000000000083",
  "revision": 1,
  "schemaVersion": 1,
  "partId": "16000000-0000-4000-8000-000000000011",
  "taskTypeCode": "GAP_FILL_CHOICE",
  "title": "In the evening, we can watch some ____ together.",
  "instructions": "Chọn từ phù hợp để hoàn thành câu.",
  "accessLevel": "PREMIUM",
  "stimulus": null,
  "sections": [],
  "items": [
   {
    "id": "item_1",
    "sequenceNo": 1,
    "prompt": {
     "format": "PLAIN_TEXT",
     "value": "In the evening, we can watch some ____ together."
    },
    "responseType": "SINGLE_CHOICE",
    "required": true,
    "maxScore": 2,
    "options": [
     {
      "id": "A",
      "code": "A",
      "content": "animals"
     },
     {
      "id": "B",
      "code": "B",
      "content": "films"
     },
     {
      "id": "C",
      "code": "C",
      "content": "bread"
     }
    ],
    "leftItems": [],
    "rightItems": [],
    "constraints": {},
    "answerKey": {
     "type": "SINGLE_CHOICE",
     "selectedOptionId": "B",
     "selectedOptionIds": [],
     "matches": {},
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
   "strategy": "EXACT_MATCH",
   "partialCredit": false,
   "maxScore": 2
  }
 },
 {
  "_id": "b1000000-0000-4000-8000-000000000084",
  "questionSetId": "b1000000-0000-4000-8000-000000000084",
  "revision": 1,
  "schemaVersion": 1,
  "partId": "16000000-0000-4000-8000-000000000011",
  "taskTypeCode": "GAP_FILL_CHOICE",
  "title": "We are ____ in a small house in the village.",
  "instructions": "Chọn từ phù hợp để hoàn thành câu.",
  "accessLevel": "PREMIUM",
  "stimulus": null,
  "sections": [],
  "items": [
   {
    "id": "item_1",
    "sequenceNo": 1,
    "prompt": {
     "format": "PLAIN_TEXT",
     "value": "We are ____ in a small house in the village."
    },
    "responseType": "SINGLE_CHOICE",
    "required": true,
    "maxScore": 2,
    "options": [
     {
      "id": "A",
      "code": "A",
      "content": "staying"
     },
     {
      "id": "B",
      "code": "B",
      "content": "garden"
     },
     {
      "id": "C",
      "code": "C",
      "content": "children"
     },
     {
      "id": "D",
      "code": "D",
      "content": "visit"
     },
     {
      "id": "E",
      "code": "E",
      "content": "old"
     }
    ],
    "leftItems": [],
    "rightItems": [],
    "constraints": {},
    "answerKey": {
     "type": "SINGLE_CHOICE",
     "selectedOptionId": "A",
     "selectedOptionIds": [],
     "matches": {},
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
   "strategy": "EXACT_MATCH",
   "partialCredit": false,
   "maxScore": 2
  }
 },
 {
  "_id": "b1000000-0000-4000-8000-000000000085",
  "questionSetId": "b1000000-0000-4000-8000-000000000085",
  "revision": 1,
  "schemaVersion": 1,
  "partId": "16000000-0000-4000-8000-000000000011",
  "taskTypeCode": "GAP_FILL_CHOICE",
  "title": "There are a lot of trees in the ____.",
  "instructions": "Chọn từ phù hợp để hoàn thành câu.",
  "accessLevel": "PREMIUM",
  "stimulus": null,
  "sections": [],
  "items": [
   {
    "id": "item_1",
    "sequenceNo": 1,
    "prompt": {
     "format": "PLAIN_TEXT",
     "value": "There are a lot of trees in the ____."
    },
    "responseType": "SINGLE_CHOICE",
    "required": true,
    "maxScore": 2,
    "options": [
     {
      "id": "A",
      "code": "A",
      "content": "staying"
     },
     {
      "id": "B",
      "code": "B",
      "content": "garden"
     },
     {
      "id": "C",
      "code": "C",
      "content": "children"
     },
     {
      "id": "D",
      "code": "D",
      "content": "visit"
     },
     {
      "id": "E",
      "code": "E",
      "content": "old"
     }
    ],
    "leftItems": [],
    "rightItems": [],
    "constraints": {},
    "answerKey": {
     "type": "SINGLE_CHOICE",
     "selectedOptionId": "B",
     "selectedOptionIds": [],
     "matches": {},
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
   "strategy": "EXACT_MATCH",
   "partialCredit": false,
   "maxScore": 2
  }
 },
 {
  "_id": "b1000000-0000-4000-8000-000000000086",
  "questionSetId": "b1000000-0000-4000-8000-000000000086",
  "revision": 1,
  "schemaVersion": 1,
  "partId": "16000000-0000-4000-8000-000000000011",
  "taskTypeCode": "GAP_FILL_CHOICE",
  "title": "We go out with our ____.",
  "instructions": "Chọn từ phù hợp để hoàn thành câu.",
  "accessLevel": "PREMIUM",
  "stimulus": null,
  "sections": [],
  "items": [
   {
    "id": "item_1",
    "sequenceNo": 1,
    "prompt": {
     "format": "PLAIN_TEXT",
     "value": "We go out with our ____."
    },
    "responseType": "SINGLE_CHOICE",
    "required": true,
    "maxScore": 2,
    "options": [
     {
      "id": "A",
      "code": "A",
      "content": "staying"
     },
     {
      "id": "B",
      "code": "B",
      "content": "garden"
     },
     {
      "id": "C",
      "code": "C",
      "content": "children"
     },
     {
      "id": "D",
      "code": "D",
      "content": "visit"
     },
     {
      "id": "E",
      "code": "E",
      "content": "old"
     }
    ],
    "leftItems": [],
    "rightItems": [],
    "constraints": {},
    "answerKey": {
     "type": "SINGLE_CHOICE",
     "selectedOptionId": "C",
     "selectedOptionIds": [],
     "matches": {},
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
   "strategy": "EXACT_MATCH",
   "partialCredit": false,
   "maxScore": 2
  }
 },
 {
  "_id": "b1000000-0000-4000-8000-000000000087",
  "questionSetId": "b1000000-0000-4000-8000-000000000087",
  "revision": 1,
  "schemaVersion": 1,
  "partId": "16000000-0000-4000-8000-000000000011",
  "taskTypeCode": "GAP_FILL_CHOICE",
  "title": "Today, we are going to ____ the town by bus.",
  "instructions": "Chọn từ phù hợp để hoàn thành câu.",
  "accessLevel": "PREMIUM",
  "stimulus": null,
  "sections": [],
  "items": [
   {
    "id": "item_1",
    "sequenceNo": 1,
    "prompt": {
     "format": "PLAIN_TEXT",
     "value": "Today, we are going to ____ the town by bus."
    },
    "responseType": "SINGLE_CHOICE",
    "required": true,
    "maxScore": 2,
    "options": [
     {
      "id": "A",
      "code": "A",
      "content": "staying"
     },
     {
      "id": "B",
      "code": "B",
      "content": "garden"
     },
     {
      "id": "C",
      "code": "C",
      "content": "children"
     },
     {
      "id": "D",
      "code": "D",
      "content": "visit"
     },
     {
      "id": "E",
      "code": "E",
      "content": "old"
     }
    ],
    "leftItems": [],
    "rightItems": [],
    "constraints": {},
    "answerKey": {
     "type": "SINGLE_CHOICE",
     "selectedOptionId": "D",
     "selectedOptionIds": [],
     "matches": {},
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
   "strategy": "EXACT_MATCH",
   "partialCredit": false,
   "maxScore": 2
  }
 },
 {
  "_id": "b1000000-0000-4000-8000-000000000088",
  "questionSetId": "b1000000-0000-4000-8000-000000000088",
  "revision": 1,
  "schemaVersion": 1,
  "partId": "16000000-0000-4000-8000-000000000011",
  "taskTypeCode": "GAP_FILL_CHOICE",
  "title": "There are some ____ buildings there.",
  "instructions": "Chọn từ phù hợp để hoàn thành câu.",
  "accessLevel": "PREMIUM",
  "stimulus": null,
  "sections": [],
  "items": [
   {
    "id": "item_1",
    "sequenceNo": 1,
    "prompt": {
     "format": "PLAIN_TEXT",
     "value": "There are some ____ buildings there."
    },
    "responseType": "SINGLE_CHOICE",
    "required": true,
    "maxScore": 2,
    "options": [
     {
      "id": "A",
      "code": "A",
      "content": "staying"
     },
     {
      "id": "B",
      "code": "B",
      "content": "garden"
     },
     {
      "id": "C",
      "code": "C",
      "content": "children"
     },
     {
      "id": "D",
      "code": "D",
      "content": "visit"
     },
     {
      "id": "E",
      "code": "E",
      "content": "old"
     }
    ],
    "leftItems": [],
    "rightItems": [],
    "constraints": {},
    "answerKey": {
     "type": "SINGLE_CHOICE",
     "selectedOptionId": "E",
     "selectedOptionIds": [],
     "matches": {},
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
   "strategy": "EXACT_MATCH",
   "partialCredit": false,
   "maxScore": 2
  }
 },
 {
  "_id": "b1000000-0000-4000-8000-000000000089",
  "questionSetId": "b1000000-0000-4000-8000-000000000089",
  "revision": 1,
  "schemaVersion": 1,
  "partId": "16000000-0000-4000-8000-000000000011",
  "taskTypeCode": "GAP_FILL_CHOICE",
  "title": "I ____ the area where I live now.",
  "instructions": "Chọn từ phù hợp để hoàn thành câu.",
  "accessLevel": "PREMIUM",
  "stimulus": null,
  "sections": [],
  "items": [
   {
    "id": "item_1",
    "sequenceNo": 1,
    "prompt": {
     "format": "PLAIN_TEXT",
     "value": "I ____ the area where I live now."
    },
    "responseType": "SINGLE_CHOICE",
    "required": true,
    "maxScore": 2,
    "options": [
     {
      "id": "A",
      "code": "A",
      "content": "love"
     },
     {
      "id": "B",
      "code": "B",
      "content": "run"
     },
     {
      "id": "C",
      "code": "C",
      "content": "should"
     }
    ],
    "leftItems": [],
    "rightItems": [],
    "constraints": {},
    "answerKey": {
     "type": "SINGLE_CHOICE",
     "selectedOptionId": "A",
     "selectedOptionIds": [],
     "matches": {},
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
   "strategy": "EXACT_MATCH",
   "partialCredit": false,
   "maxScore": 2
  }
 },
 {
  "_id": "b1000000-0000-4000-8000-000000000090",
  "questionSetId": "b1000000-0000-4000-8000-000000000090",
  "revision": 1,
  "schemaVersion": 1,
  "partId": "16000000-0000-4000-8000-000000000011",
  "taskTypeCode": "GAP_FILL_CHOICE",
  "title": "My house has a kitchen but it is very ____.",
  "instructions": "Chọn từ phù hợp để hoàn thành câu.",
  "accessLevel": "PREMIUM",
  "stimulus": null,
  "sections": [],
  "items": [
   {
    "id": "item_1",
    "sequenceNo": 1,
    "prompt": {
     "format": "PLAIN_TEXT",
     "value": "My house has a kitchen but it is very ____."
    },
    "responseType": "SINGLE_CHOICE",
    "required": true,
    "maxScore": 2,
    "options": [
     {
      "id": "A",
      "code": "A",
      "content": "small"
     },
     {
      "id": "B",
      "code": "B",
      "content": "tall"
     },
     {
      "id": "C",
      "code": "C",
      "content": "short"
     }
    ],
    "leftItems": [],
    "rightItems": [],
    "constraints": {},
    "answerKey": {
     "type": "SINGLE_CHOICE",
     "selectedOptionId": "A",
     "selectedOptionIds": [],
     "matches": {},
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
   "strategy": "EXACT_MATCH",
   "partialCredit": false,
   "maxScore": 2
  }
 },
 {
  "_id": "b1000000-0000-4000-8000-000000000091",
  "questionSetId": "b1000000-0000-4000-8000-000000000091",
  "revision": 1,
  "schemaVersion": 1,
  "partId": "16000000-0000-4000-8000-000000000011",
  "taskTypeCode": "GAP_FILL_CHOICE",
  "title": "I wear a ____ shirt.",
  "instructions": "Chọn từ phù hợp để hoàn thành câu.",
  "accessLevel": "PREMIUM",
  "stimulus": null,
  "sections": [],
  "items": [
   {
    "id": "item_1",
    "sequenceNo": 1,
    "prompt": {
     "format": "PLAIN_TEXT",
     "value": "I wear a ____ shirt."
    },
    "responseType": "SINGLE_CHOICE",
    "required": true,
    "maxScore": 2,
    "options": [
     {
      "id": "A",
      "code": "A",
      "content": "car"
     },
     {
      "id": "B",
      "code": "B",
      "content": "shop"
     },
     {
      "id": "C",
      "code": "C",
      "content": "window"
     }
    ],
    "leftItems": [],
    "rightItems": [],
    "constraints": {},
    "answerKey": {
     "type": "SINGLE_CHOICE",
     "selectedOptionId": "B",
     "selectedOptionIds": [],
     "matches": {},
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
   "strategy": "EXACT_MATCH",
   "partialCredit": false,
   "maxScore": 2
  }
 },
 {
  "_id": "b1000000-0000-4000-8000-000000000092",
  "questionSetId": "b1000000-0000-4000-8000-000000000092",
  "revision": 1,
  "schemaVersion": 1,
  "partId": "16000000-0000-4000-8000-000000000011",
  "taskTypeCode": "GAP_FILL_CHOICE",
  "title": "Every day I talk to many ____.",
  "instructions": "Chọn từ phù hợp để hoàn thành câu.",
  "accessLevel": "PREMIUM",
  "stimulus": null,
  "sections": [],
  "items": [
   {
    "id": "item_1",
    "sequenceNo": 1,
    "prompt": {
     "format": "PLAIN_TEXT",
     "value": "Every day I talk to many ____."
    },
    "responseType": "SINGLE_CHOICE",
    "required": true,
    "maxScore": 2,
    "options": [
     {
      "id": "A",
      "code": "A",
      "content": "animals"
     },
     {
      "id": "B",
      "code": "B",
      "content": "trees"
     },
     {
      "id": "C",
      "code": "C",
      "content": "people"
     }
    ],
    "leftItems": [],
    "rightItems": [],
    "constraints": {},
    "answerKey": {
     "type": "SINGLE_CHOICE",
     "selectedOptionId": "C",
     "selectedOptionIds": [],
     "matches": {},
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
   "strategy": "EXACT_MATCH",
   "partialCredit": false,
   "maxScore": 2
  }
 },
 {
  "_id": "b1000000-0000-4000-8000-000000000093",
  "questionSetId": "b1000000-0000-4000-8000-000000000093",
  "revision": 1,
  "schemaVersion": 1,
  "partId": "16000000-0000-4000-8000-000000000011",
  "taskTypeCode": "GAP_FILL_CHOICE",
  "title": "I am on my holiday and I am excited that I can ____ you soon.",
  "instructions": "Chọn từ phù hợp để hoàn thành câu.",
  "accessLevel": "PREMIUM",
  "stimulus": null,
  "sections": [],
  "items": [
   {
    "id": "item_1",
    "sequenceNo": 1,
    "prompt": {
     "format": "PLAIN_TEXT",
     "value": "I am on my holiday and I am excited that I can ____ you soon."
    },
    "responseType": "SINGLE_CHOICE",
    "required": true,
    "maxScore": 2,
    "options": [
     {
      "id": "A",
      "code": "A",
      "content": "show"
     },
     {
      "id": "B",
      "code": "B",
      "content": "visit"
     },
     {
      "id": "C",
      "code": "C",
      "content": "play"
     }
    ],
    "leftItems": [],
    "rightItems": [],
    "constraints": {},
    "answerKey": {
     "type": "SINGLE_CHOICE",
     "selectedOptionId": "B",
     "selectedOptionIds": [],
     "matches": {},
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
   "strategy": "EXACT_MATCH",
   "partialCredit": false,
   "maxScore": 2
  }
 },
 {
  "_id": "b1000000-0000-4000-8000-000000000094",
  "questionSetId": "b1000000-0000-4000-8000-000000000094",
  "revision": 1,
  "schemaVersion": 1,
  "partId": "16000000-0000-4000-8000-000000000011",
  "taskTypeCode": "GAP_FILL_CHOICE",
  "title": "Please close the ______ before you leave the room.",
  "instructions": "Chọn từ phù hợp để hoàn thành câu.",
  "accessLevel": "PREMIUM",
  "stimulus": null,
  "sections": [],
  "items": [
   {
    "id": "item_1",
    "sequenceNo": 1,
    "prompt": {
     "format": "PLAIN_TEXT",
     "value": "Please close the ______ before you leave the room."
    },
    "responseType": "SINGLE_CHOICE",
    "required": true,
    "maxScore": 2,
    "options": [
     {
      "id": "A",
      "code": "A",
      "content": "window"
     },
     {
      "id": "B",
      "code": "B",
      "content": "weather"
     },
     {
      "id": "C",
      "code": "C",
      "content": "street"
     }
    ],
    "leftItems": [],
    "rightItems": [],
    "constraints": {},
    "answerKey": {
     "type": "SINGLE_CHOICE",
     "selectedOptionId": "A",
     "selectedOptionIds": [],
     "matches": {},
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
   "strategy": "EXACT_MATCH",
   "partialCredit": false,
   "maxScore": 2
  }
 },
 {
  "_id": "b1000000-0000-4000-8000-000000000095",
  "questionSetId": "b1000000-0000-4000-8000-000000000095",
  "revision": 1,
  "schemaVersion": 1,
  "partId": "16000000-0000-4000-8000-000000000011",
  "taskTypeCode": "GAP_FILL_CHOICE",
  "title": "I usually ______ breakfast at seven o'clock.",
  "instructions": "Chọn từ phù hợp để hoàn thành câu.",
  "accessLevel": "PREMIUM",
  "stimulus": null,
  "sections": [],
  "items": [
   {
    "id": "item_1",
    "sequenceNo": 1,
    "prompt": {
     "format": "PLAIN_TEXT",
     "value": "I usually ______ breakfast at seven o'clock."
    },
    "responseType": "SINGLE_CHOICE",
    "required": true,
    "maxScore": 2,
    "options": [
     {
      "id": "A",
      "code": "A",
      "content": "make"
     },
     {
      "id": "B",
      "code": "B",
      "content": "have"
     },
     {
      "id": "C",
      "code": "C",
      "content": "take"
     }
    ],
    "leftItems": [],
    "rightItems": [],
    "constraints": {},
    "answerKey": {
     "type": "SINGLE_CHOICE",
     "selectedOptionId": "B",
     "selectedOptionIds": [],
     "matches": {},
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
   "strategy": "EXACT_MATCH",
   "partialCredit": false,
   "maxScore": 2
  }
 },
 {
  "_id": "b1000000-0000-4000-8000-000000000096",
  "questionSetId": "b1000000-0000-4000-8000-000000000096",
  "revision": 1,
  "schemaVersion": 1,
  "partId": "16000000-0000-4000-8000-000000000011",
  "taskTypeCode": "GAP_FILL_CHOICE",
  "title": "My brother works in a large ______ near the airport.",
  "instructions": "Chọn từ phù hợp để hoàn thành câu.",
  "accessLevel": "PREMIUM",
  "stimulus": null,
  "sections": [],
  "items": [
   {
    "id": "item_1",
    "sequenceNo": 1,
    "prompt": {
     "format": "PLAIN_TEXT",
     "value": "My brother works in a large ______ near the airport."
    },
    "responseType": "SINGLE_CHOICE",
    "required": true,
    "maxScore": 2,
    "options": [
     {
      "id": "A",
      "code": "A",
      "content": "lesson"
     },
     {
      "id": "B",
      "code": "B",
      "content": "garden"
     },
     {
      "id": "C",
      "code": "C",
      "content": "company"
     }
    ],
    "leftItems": [],
    "rightItems": [],
    "constraints": {},
    "answerKey": {
     "type": "SINGLE_CHOICE",
     "selectedOptionId": "C",
     "selectedOptionIds": [],
     "matches": {},
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
   "strategy": "EXACT_MATCH",
   "partialCredit": false,
   "maxScore": 2
  }
 },
 {
  "_id": "b1000000-0000-4000-8000-000000000097",
  "questionSetId": "b1000000-0000-4000-8000-000000000097",
  "revision": 1,
  "schemaVersion": 1,
  "partId": "16000000-0000-4000-8000-000000000011",
  "taskTypeCode": "GAP_FILL_CHOICE",
  "title": "She is waiting ______ the bus.",
  "instructions": "Chọn từ phù hợp để hoàn thành câu.",
  "accessLevel": "PREMIUM",
  "stimulus": null,
  "sections": [],
  "items": [
   {
    "id": "item_1",
    "sequenceNo": 1,
    "prompt": {
     "format": "PLAIN_TEXT",
     "value": "She is waiting ______ the bus."
    },
    "responseType": "SINGLE_CHOICE",
    "required": true,
    "maxScore": 2,
    "options": [
     {
      "id": "A",
      "code": "A",
      "content": "for"
     },
     {
      "id": "B",
      "code": "B",
      "content": "from"
     },
     {
      "id": "C",
      "code": "C",
      "content": "with"
     }
    ],
    "leftItems": [],
    "rightItems": [],
    "constraints": {},
    "answerKey": {
     "type": "SINGLE_CHOICE",
     "selectedOptionId": "A",
     "selectedOptionIds": [],
     "matches": {},
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
   "strategy": "EXACT_MATCH",
   "partialCredit": false,
   "maxScore": 2
  }
 },
 {
  "_id": "b1000000-0000-4000-8000-000000000098",
  "questionSetId": "b1000000-0000-4000-8000-000000000098",
  "revision": 1,
  "schemaVersion": 1,
  "partId": "16000000-0000-4000-8000-000000000011",
  "taskTypeCode": "GAP_FILL_CHOICE",
  "title": "We need to buy some ______ for dinner.",
  "instructions": "Chọn từ phù hợp để hoàn thành câu.",
  "accessLevel": "PREMIUM",
  "stimulus": null,
  "sections": [],
  "items": [
   {
    "id": "item_1",
    "sequenceNo": 1,
    "prompt": {
     "format": "PLAIN_TEXT",
     "value": "We need to buy some ______ for dinner."
    },
    "responseType": "SINGLE_CHOICE",
    "required": true,
    "maxScore": 2,
    "options": [
     {
      "id": "A",
      "code": "A",
      "content": "sleep"
     },
     {
      "id": "B",
      "code": "B",
      "content": "food"
     },
     {
      "id": "C",
      "code": "C",
      "content": "homework"
     }
    ],
    "leftItems": [],
    "rightItems": [],
    "constraints": {},
    "answerKey": {
     "type": "SINGLE_CHOICE",
     "selectedOptionId": "B",
     "selectedOptionIds": [],
     "matches": {},
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
   "strategy": "EXACT_MATCH",
   "partialCredit": false,
   "maxScore": 2
  }
 },
 {
  "_id": "b1000000-0000-4000-8000-000000000099",
  "questionSetId": "b1000000-0000-4000-8000-000000000099",
  "revision": 1,
  "schemaVersion": 1,
  "partId": "16000000-0000-4000-8000-000000000011",
  "taskTypeCode": "GAP_FILL_CHOICE",
  "title": "The train leaves at half ______ eight.",
  "instructions": "Chọn từ phù hợp để hoàn thành câu.",
  "accessLevel": "PREMIUM",
  "stimulus": null,
  "sections": [],
  "items": [
   {
    "id": "item_1",
    "sequenceNo": 1,
    "prompt": {
     "format": "PLAIN_TEXT",
     "value": "The train leaves at half ______ eight."
    },
    "responseType": "SINGLE_CHOICE",
    "required": true,
    "maxScore": 2,
    "options": [
     {
      "id": "A",
      "code": "A",
      "content": "after"
     },
     {
      "id": "B",
      "code": "B",
      "content": "behind"
     },
     {
      "id": "C",
      "code": "C",
      "content": "past"
     }
    ],
    "leftItems": [],
    "rightItems": [],
    "constraints": {},
    "answerKey": {
     "type": "SINGLE_CHOICE",
     "selectedOptionId": "C",
     "selectedOptionIds": [],
     "matches": {},
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
   "strategy": "EXACT_MATCH",
   "partialCredit": false,
   "maxScore": 2
  }
 },
 {
  "_id": "b1000000-0000-4000-8000-000000000100",
  "questionSetId": "b1000000-0000-4000-8000-000000000100",
  "revision": 1,
  "schemaVersion": 1,
  "partId": "16000000-0000-4000-8000-000000000011",
  "taskTypeCode": "GAP_FILL_CHOICE",
  "title": "Could you ______ me your phone number?",
  "instructions": "Chọn từ phù hợp để hoàn thành câu.",
  "accessLevel": "PREMIUM",
  "stimulus": null,
  "sections": [],
  "items": [
   {
    "id": "item_1",
    "sequenceNo": 1,
    "prompt": {
     "format": "PLAIN_TEXT",
     "value": "Could you ______ me your phone number?"
    },
    "responseType": "SINGLE_CHOICE",
    "required": true,
    "maxScore": 2,
    "options": [
     {
      "id": "A",
      "code": "A",
      "content": "tell"
     },
     {
      "id": "B",
      "code": "B",
      "content": "speak"
     },
     {
      "id": "C",
      "code": "C",
      "content": "talk"
     }
    ],
    "leftItems": [],
    "rightItems": [],
    "constraints": {},
    "answerKey": {
     "type": "SINGLE_CHOICE",
     "selectedOptionId": "A",
     "selectedOptionIds": [],
     "matches": {},
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
   "strategy": "EXACT_MATCH",
   "partialCredit": false,
   "maxScore": 2
  }
 },
 {
  "_id": "b1000000-0000-4000-8000-000000000101",
  "questionSetId": "b1000000-0000-4000-8000-000000000101",
  "revision": 1,
  "schemaVersion": 1,
  "partId": "16000000-0000-4000-8000-000000000011",
  "taskTypeCode": "GAP_FILL_CHOICE",
  "title": "My parents live in a small ______.",
  "instructions": "Chọn từ phù hợp để hoàn thành câu.",
  "accessLevel": "PREMIUM",
  "stimulus": null,
  "sections": [],
  "items": [
   {
    "id": "item_1",
    "sequenceNo": 1,
    "prompt": {
     "format": "PLAIN_TEXT",
     "value": "My parents live in a small ______."
    },
    "responseType": "SINGLE_CHOICE",
    "required": true,
    "maxScore": 2,
    "options": [
     {
      "id": "A",
      "code": "A",
      "content": "meeting"
     },
     {
      "id": "B",
      "code": "B",
      "content": "village"
     },
     {
      "id": "C",
      "code": "C",
      "content": "office"
     }
    ],
    "leftItems": [],
    "rightItems": [],
    "constraints": {},
    "answerKey": {
     "type": "SINGLE_CHOICE",
     "selectedOptionId": "B",
     "selectedOptionIds": [],
     "matches": {},
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
   "strategy": "EXACT_MATCH",
   "partialCredit": false,
   "maxScore": 2
  }
 },
 {
  "_id": "b1000000-0000-4000-8000-000000000102",
  "questionSetId": "b1000000-0000-4000-8000-000000000102",
  "revision": 1,
  "schemaVersion": 1,
  "partId": "16000000-0000-4000-8000-000000000011",
  "taskTypeCode": "GAP_FILL_CHOICE",
  "title": "I always ______ my teeth before going to bed.",
  "instructions": "Chọn từ phù hợp để hoàn thành câu.",
  "accessLevel": "PREMIUM",
  "stimulus": null,
  "sections": [],
  "items": [
   {
    "id": "item_1",
    "sequenceNo": 1,
    "prompt": {
     "format": "PLAIN_TEXT",
     "value": "I always ______ my teeth before going to bed."
    },
    "responseType": "SINGLE_CHOICE",
    "required": true,
    "maxScore": 2,
    "options": [
     {
      "id": "A",
      "code": "A",
      "content": "wash"
     },
     {
      "id": "B",
      "code": "B",
      "content": "cleaning"
     },
     {
      "id": "C",
      "code": "C",
      "content": "brush"
     }
    ],
    "leftItems": [],
    "rightItems": [],
    "constraints": {},
    "answerKey": {
     "type": "SINGLE_CHOICE",
     "selectedOptionId": "C",
     "selectedOptionIds": [],
     "matches": {},
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
   "strategy": "EXACT_MATCH",
   "partialCredit": false,
   "maxScore": 2
  }
 },
 {
  "_id": "b1000000-0000-4000-8000-000000000103",
  "questionSetId": "b1000000-0000-4000-8000-000000000103",
  "revision": 1,
  "schemaVersion": 1,
  "partId": "16000000-0000-4000-8000-000000000011",
  "taskTypeCode": "GAP_FILL_CHOICE",
  "title": "The shop is ______ on Sundays.",
  "instructions": "Chọn từ phù hợp để hoàn thành câu.",
  "accessLevel": "PREMIUM",
  "stimulus": null,
  "sections": [],
  "items": [
   {
    "id": "item_1",
    "sequenceNo": 1,
    "prompt": {
     "format": "PLAIN_TEXT",
     "value": "The shop is ______ on Sundays."
    },
    "responseType": "SINGLE_CHOICE",
    "required": true,
    "maxScore": 2,
    "options": [
     {
      "id": "A",
      "code": "A",
      "content": "closed"
     },
     {
      "id": "B",
      "code": "B",
      "content": "heavy"
     },
     {
      "id": "C",
      "code": "C",
      "content": "slow"
     }
    ],
    "leftItems": [],
    "rightItems": [],
    "constraints": {},
    "answerKey": {
     "type": "SINGLE_CHOICE",
     "selectedOptionId": "A",
     "selectedOptionIds": [],
     "matches": {},
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
   "strategy": "EXACT_MATCH",
   "partialCredit": false,
   "maxScore": 2
  }
 },
 {
  "_id": "b1000000-0000-4000-8000-000000000104",
  "questionSetId": "b1000000-0000-4000-8000-000000000104",
  "revision": 1,
  "schemaVersion": 1,
  "partId": "16000000-0000-4000-8000-000000000011",
  "taskTypeCode": "GAP_FILL_CHOICE",
  "title": "We walked home because we ______ the last bus.",
  "instructions": "Chọn từ phù hợp để hoàn thành câu.",
  "accessLevel": "PREMIUM",
  "stimulus": null,
  "sections": [],
  "items": [
   {
    "id": "item_1",
    "sequenceNo": 1,
    "prompt": {
     "format": "PLAIN_TEXT",
     "value": "We walked home because we ______ the last bus."
    },
    "responseType": "SINGLE_CHOICE",
    "required": true,
    "maxScore": 2,
    "options": [
     {
      "id": "A",
      "code": "A",
      "content": "lost"
     },
     {
      "id": "B",
      "code": "B",
      "content": "missed"
     },
     {
      "id": "C",
      "code": "C",
      "content": "forgot"
     }
    ],
    "leftItems": [],
    "rightItems": [],
    "constraints": {},
    "answerKey": {
     "type": "SINGLE_CHOICE",
     "selectedOptionId": "B",
     "selectedOptionIds": [],
     "matches": {},
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
   "strategy": "EXACT_MATCH",
   "partialCredit": false,
   "maxScore": 2
  }
 },
 {
  "_id": "b1000000-0000-4000-8000-000000000105",
  "questionSetId": "b1000000-0000-4000-8000-000000000105",
  "revision": 1,
  "schemaVersion": 1,
  "partId": "16000000-0000-4000-8000-000000000011",
  "taskTypeCode": "GAP_FILL_CHOICE",
  "title": "The manager will ______ the results tomorrow.",
  "instructions": "Chọn từ phù hợp để hoàn thành câu.",
  "accessLevel": "PREMIUM",
  "stimulus": null,
  "sections": [],
  "items": [
   {
    "id": "item_1",
    "sequenceNo": 1,
    "prompt": {
     "format": "PLAIN_TEXT",
     "value": "The manager will ______ the results tomorrow."
    },
    "responseType": "SINGLE_CHOICE",
    "required": true,
    "maxScore": 2,
    "options": [
     {
      "id": "A",
      "code": "A",
      "content": "grow"
     },
     {
      "id": "B",
      "code": "B",
      "content": "wear"
     },
     {
      "id": "C",
      "code": "C",
      "content": "check"
     }
    ],
    "leftItems": [],
    "rightItems": [],
    "constraints": {},
    "answerKey": {
     "type": "SINGLE_CHOICE",
     "selectedOptionId": "C",
     "selectedOptionIds": [],
     "matches": {},
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
   "strategy": "EXACT_MATCH",
   "partialCredit": false,
   "maxScore": 2
  }
 },
 {
  "_id": "b1000000-0000-4000-8000-000000000106",
  "questionSetId": "b1000000-0000-4000-8000-000000000106",
  "revision": 1,
  "schemaVersion": 1,
  "partId": "16000000-0000-4000-8000-000000000011",
  "taskTypeCode": "GAP_FILL_CHOICE",
  "title": "Please put your books on the ______.",
  "instructions": "Chọn từ phù hợp để hoàn thành câu.",
  "accessLevel": "PREMIUM",
  "stimulus": null,
  "sections": [],
  "items": [
   {
    "id": "item_1",
    "sequenceNo": 1,
    "prompt": {
     "format": "PLAIN_TEXT",
     "value": "Please put your books on the ______."
    },
    "responseType": "SINGLE_CHOICE",
    "required": true,
    "maxScore": 2,
    "options": [
     {
      "id": "A",
      "code": "A",
      "content": "table"
     },
     {
      "id": "B",
      "code": "B",
      "content": "flooring"
     },
     {
      "id": "C",
      "code": "C",
      "content": "light"
     }
    ],
    "leftItems": [],
    "rightItems": [],
    "constraints": {},
    "answerKey": {
     "type": "SINGLE_CHOICE",
     "selectedOptionId": "A",
     "selectedOptionIds": [],
     "matches": {},
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
   "strategy": "EXACT_MATCH",
   "partialCredit": false,
   "maxScore": 2
  }
 },
 {
  "_id": "b1000000-0000-4000-8000-000000000107",
  "questionSetId": "b1000000-0000-4000-8000-000000000107",
  "revision": 1,
  "schemaVersion": 1,
  "partId": "16000000-0000-4000-8000-000000000011",
  "taskTypeCode": "GAP_FILL_CHOICE",
  "title": "I need to ______ an appointment with the doctor.",
  "instructions": "Chọn từ phù hợp để hoàn thành câu.",
  "accessLevel": "PREMIUM",
  "stimulus": null,
  "sections": [],
  "items": [
   {
    "id": "item_1",
    "sequenceNo": 1,
    "prompt": {
     "format": "PLAIN_TEXT",
     "value": "I need to ______ an appointment with the doctor."
    },
    "responseType": "SINGLE_CHOICE",
    "required": true,
    "maxScore": 2,
    "options": [
     {
      "id": "A",
      "code": "A",
      "content": "do"
     },
     {
      "id": "B",
      "code": "B",
      "content": "make"
     },
     {
      "id": "C",
      "code": "C",
      "content": "build"
     }
    ],
    "leftItems": [],
    "rightItems": [],
    "constraints": {},
    "answerKey": {
     "type": "SINGLE_CHOICE",
     "selectedOptionId": "B",
     "selectedOptionIds": [],
     "matches": {},
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
   "strategy": "EXACT_MATCH",
   "partialCredit": false,
   "maxScore": 2
  }
 },
 {
  "_id": "b1000000-0000-4000-8000-000000000108",
  "questionSetId": "b1000000-0000-4000-8000-000000000108",
  "revision": 1,
  "schemaVersion": 1,
  "partId": "16000000-0000-4000-8000-000000000011",
  "taskTypeCode": "GAP_FILL_CHOICE",
  "title": "She wore a warm coat because it was ______ outside.",
  "instructions": "Chọn từ phù hợp để hoàn thành câu.",
  "accessLevel": "PREMIUM",
  "stimulus": null,
  "sections": [],
  "items": [
   {
    "id": "item_1",
    "sequenceNo": 1,
    "prompt": {
     "format": "PLAIN_TEXT",
     "value": "She wore a warm coat because it was ______ outside."
    },
    "responseType": "SINGLE_CHOICE",
    "required": true,
    "maxScore": 2,
    "options": [
     {
      "id": "A",
      "code": "A",
      "content": "hungry"
     },
     {
      "id": "B",
      "code": "B",
      "content": "quiet"
     },
     {
      "id": "C",
      "code": "C",
      "content": "cold"
     }
    ],
    "leftItems": [],
    "rightItems": [],
    "constraints": {},
    "answerKey": {
     "type": "SINGLE_CHOICE",
     "selectedOptionId": "C",
     "selectedOptionIds": [],
     "matches": {},
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
   "strategy": "EXACT_MATCH",
   "partialCredit": false,
   "maxScore": 2
  }
 },
 {
  "_id": "b1000000-0000-4000-8000-000000000109",
  "questionSetId": "b1000000-0000-4000-8000-000000000109",
  "revision": 1,
  "schemaVersion": 1,
  "partId": "16000000-0000-4000-8000-000000000011",
  "taskTypeCode": "GAP_FILL_CHOICE",
  "title": "My sister is very good ______ maths.",
  "instructions": "Chọn từ phù hợp để hoàn thành câu.",
  "accessLevel": "PREMIUM",
  "stimulus": null,
  "sections": [],
  "items": [
   {
    "id": "item_1",
    "sequenceNo": 1,
    "prompt": {
     "format": "PLAIN_TEXT",
     "value": "My sister is very good ______ maths."
    },
    "responseType": "SINGLE_CHOICE",
    "required": true,
    "maxScore": 2,
    "options": [
     {
      "id": "A",
      "code": "A",
      "content": "at"
     },
     {
      "id": "B",
      "code": "B",
      "content": "on"
     },
     {
      "id": "C",
      "code": "C",
      "content": "for"
     }
    ],
    "leftItems": [],
    "rightItems": [],
    "constraints": {},
    "answerKey": {
     "type": "SINGLE_CHOICE",
     "selectedOptionId": "A",
     "selectedOptionIds": [],
     "matches": {},
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
   "strategy": "EXACT_MATCH",
   "partialCredit": false,
   "maxScore": 2
  }
 },
 {
  "_id": "b1000000-0000-4000-8000-000000000110",
  "questionSetId": "b1000000-0000-4000-8000-000000000110",
  "revision": 1,
  "schemaVersion": 1,
  "partId": "16000000-0000-4000-8000-000000000011",
  "taskTypeCode": "GAP_FILL_CHOICE",
  "title": "We are planning to ______ a new computer.",
  "instructions": "Chọn từ phù hợp để hoàn thành câu.",
  "accessLevel": "PREMIUM",
  "stimulus": null,
  "sections": [],
  "items": [
   {
    "id": "item_1",
    "sequenceNo": 1,
    "prompt": {
     "format": "PLAIN_TEXT",
     "value": "We are planning to ______ a new computer."
    },
    "responseType": "SINGLE_CHOICE",
    "required": true,
    "maxScore": 2,
    "options": [
     {
      "id": "A",
      "code": "A",
      "content": "pay"
     },
     {
      "id": "B",
      "code": "B",
      "content": "buy"
     },
     {
      "id": "C",
      "code": "C",
      "content": "spend"
     }
    ],
    "leftItems": [],
    "rightItems": [],
    "constraints": {},
    "answerKey": {
     "type": "SINGLE_CHOICE",
     "selectedOptionId": "B",
     "selectedOptionIds": [],
     "matches": {},
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
   "strategy": "EXACT_MATCH",
   "partialCredit": false,
   "maxScore": 2
  }
 },
 {
  "_id": "b1000000-0000-4000-8000-000000000111",
  "questionSetId": "b1000000-0000-4000-8000-000000000111",
  "revision": 1,
  "schemaVersion": 1,
  "partId": "16000000-0000-4000-8000-000000000011",
  "taskTypeCode": "GAP_FILL_CHOICE",
  "title": "The teacher asked us to work in ______.",
  "instructions": "Chọn từ phù hợp để hoàn thành câu.",
  "accessLevel": "PREMIUM",
  "stimulus": null,
  "sections": [],
  "items": [
   {
    "id": "item_1",
    "sequenceNo": 1,
    "prompt": {
     "format": "PLAIN_TEXT",
     "value": "The teacher asked us to work in ______."
    },
    "responseType": "SINGLE_CHOICE",
    "required": true,
    "maxScore": 2,
    "options": [
     {
      "id": "A",
      "code": "A",
      "content": "pages"
     },
     {
      "id": "B",
      "code": "B",
      "content": "letters"
     },
     {
      "id": "C",
      "code": "C",
      "content": "pairs"
     }
    ],
    "leftItems": [],
    "rightItems": [],
    "constraints": {},
    "answerKey": {
     "type": "SINGLE_CHOICE",
     "selectedOptionId": "C",
     "selectedOptionIds": [],
     "matches": {},
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
   "strategy": "EXACT_MATCH",
   "partialCredit": false,
   "maxScore": 2
  }
 },
 {
  "_id": "b1000000-0000-4000-8000-000000000112",
  "questionSetId": "b1000000-0000-4000-8000-000000000112",
  "revision": 1,
  "schemaVersion": 1,
  "partId": "16000000-0000-4000-8000-000000000011",
  "taskTypeCode": "GAP_FILL_CHOICE",
  "title": "I cannot hear you. Please speak more ______.",
  "instructions": "Chọn từ phù hợp để hoàn thành câu.",
  "accessLevel": "PREMIUM",
  "stimulus": null,
  "sections": [],
  "items": [
   {
    "id": "item_1",
    "sequenceNo": 1,
    "prompt": {
     "format": "PLAIN_TEXT",
     "value": "I cannot hear you. Please speak more ______."
    },
    "responseType": "SINGLE_CHOICE",
    "required": true,
    "maxScore": 2,
    "options": [
     {
      "id": "A",
      "code": "A",
      "content": "clearly"
     },
     {
      "id": "B",
      "code": "B",
      "content": "carefully"
     },
     {
      "id": "C",
      "code": "C",
      "content": "quietly"
     }
    ],
    "leftItems": [],
    "rightItems": [],
    "constraints": {},
    "answerKey": {
     "type": "SINGLE_CHOICE",
     "selectedOptionId": "A",
     "selectedOptionIds": [],
     "matches": {},
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
   "strategy": "EXACT_MATCH",
   "partialCredit": false,
   "maxScore": 2
  }
 },
 {
  "_id": "b1000000-0000-4000-8000-000000000113",
  "questionSetId": "b1000000-0000-4000-8000-000000000113",
  "revision": 1,
  "schemaVersion": 1,
  "partId": "16000000-0000-4000-8000-000000000011",
  "taskTypeCode": "GAP_FILL_CHOICE",
  "title": "He arrived late because the traffic was very ______.",
  "instructions": "Chọn từ phù hợp để hoàn thành câu.",
  "accessLevel": "PREMIUM",
  "stimulus": null,
  "sections": [],
  "items": [
   {
    "id": "item_1",
    "sequenceNo": 1,
    "prompt": {
     "format": "PLAIN_TEXT",
     "value": "He arrived late because the traffic was very ______."
    },
    "responseType": "SINGLE_CHOICE",
    "required": true,
    "maxScore": 2,
    "options": [
     {
      "id": "A",
      "code": "A",
      "content": "strong"
     },
     {
      "id": "B",
      "code": "B",
      "content": "heavy"
     },
     {
      "id": "C",
      "code": "C",
      "content": "full"
     }
    ],
    "leftItems": [],
    "rightItems": [],
    "constraints": {},
    "answerKey": {
     "type": "SINGLE_CHOICE",
     "selectedOptionId": "B",
     "selectedOptionIds": [],
     "matches": {},
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
   "strategy": "EXACT_MATCH",
   "partialCredit": false,
   "maxScore": 2
  }
 },
 {
  "_id": "b1000000-0000-4000-8000-000000000114",
  "questionSetId": "b1000000-0000-4000-8000-000000000114",
  "revision": 1,
  "schemaVersion": 1,
  "partId": "16000000-0000-4000-8000-000000000011",
  "taskTypeCode": "GAP_FILL_CHOICE",
  "title": "Would you like a cup ______ coffee?",
  "instructions": "Chọn từ phù hợp để hoàn thành câu.",
  "accessLevel": "PREMIUM",
  "stimulus": null,
  "sections": [],
  "items": [
   {
    "id": "item_1",
    "sequenceNo": 1,
    "prompt": {
     "format": "PLAIN_TEXT",
     "value": "Would you like a cup ______ coffee?"
    },
    "responseType": "SINGLE_CHOICE",
    "required": true,
    "maxScore": 2,
    "options": [
     {
      "id": "A",
      "code": "A",
      "content": "from"
     },
     {
      "id": "B",
      "code": "B",
      "content": "with"
     },
     {
      "id": "C",
      "code": "C",
      "content": "of"
     }
    ],
    "leftItems": [],
    "rightItems": [],
    "constraints": {},
    "answerKey": {
     "type": "SINGLE_CHOICE",
     "selectedOptionId": "C",
     "selectedOptionIds": [],
     "matches": {},
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
   "strategy": "EXACT_MATCH",
   "partialCredit": false,
   "maxScore": 2
  }
 },
 {
  "_id": "b1000000-0000-4000-8000-000000000115",
  "questionSetId": "b1000000-0000-4000-8000-000000000115",
  "revision": 1,
  "schemaVersion": 1,
  "partId": "16000000-0000-4000-8000-000000000011",
  "taskTypeCode": "GAP_FILL_CHOICE",
  "title": "My phone battery is almost ______.",
  "instructions": "Chọn từ phù hợp để hoàn thành câu.",
  "accessLevel": "PREMIUM",
  "stimulus": null,
  "sections": [],
  "items": [
   {
    "id": "item_1",
    "sequenceNo": 1,
    "prompt": {
     "format": "PLAIN_TEXT",
     "value": "My phone battery is almost ______."
    },
    "responseType": "SINGLE_CHOICE",
    "required": true,
    "maxScore": 2,
    "options": [
     {
      "id": "A",
      "code": "A",
      "content": "empty"
     },
     {
      "id": "B",
      "code": "B",
      "content": "free"
     },
     {
      "id": "C",
      "code": "C",
      "content": "quiet"
     }
    ],
    "leftItems": [],
    "rightItems": [],
    "constraints": {},
    "answerKey": {
     "type": "SINGLE_CHOICE",
     "selectedOptionId": "A",
     "selectedOptionIds": [],
     "matches": {},
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
   "strategy": "EXACT_MATCH",
   "partialCredit": false,
   "maxScore": 2
  }
 },
 {
  "_id": "b1000000-0000-4000-8000-000000000116",
  "questionSetId": "b1000000-0000-4000-8000-000000000116",
  "revision": 1,
  "schemaVersion": 1,
  "partId": "16000000-0000-4000-8000-000000000011",
  "taskTypeCode": "GAP_FILL_CHOICE",
  "title": "I usually ______ the news before work.",
  "instructions": "Chọn từ phù hợp để hoàn thành câu.",
  "accessLevel": "PREMIUM",
  "stimulus": null,
  "sections": [],
  "items": [
   {
    "id": "item_1",
    "sequenceNo": 1,
    "prompt": {
     "format": "PLAIN_TEXT",
     "value": "I usually ______ the news before work."
    },
    "responseType": "SINGLE_CHOICE",
    "required": true,
    "maxScore": 2,
    "options": [
     {
      "id": "A",
      "code": "A",
      "content": "look"
     },
     {
      "id": "B",
      "code": "B",
      "content": "read"
     },
     {
      "id": "C",
      "code": "C",
      "content": "watching"
     }
    ],
    "leftItems": [],
    "rightItems": [],
    "constraints": {},
    "answerKey": {
     "type": "SINGLE_CHOICE",
     "selectedOptionId": "B",
     "selectedOptionIds": [],
     "matches": {},
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
   "strategy": "EXACT_MATCH",
   "partialCredit": false,
   "maxScore": 2
  }
 },
 {
  "_id": "b1000000-0000-4000-8000-000000000117",
  "questionSetId": "b1000000-0000-4000-8000-000000000117",
  "revision": 1,
  "schemaVersion": 1,
  "partId": "16000000-0000-4000-8000-000000000011",
  "taskTypeCode": "GAP_FILL_CHOICE",
  "title": "Please ______ your shoes before entering the house.",
  "instructions": "Chọn từ phù hợp để hoàn thành câu.",
  "accessLevel": "PREMIUM",
  "stimulus": null,
  "sections": [],
  "items": [
   {
    "id": "item_1",
    "sequenceNo": 1,
    "prompt": {
     "format": "PLAIN_TEXT",
     "value": "Please ______ your shoes before entering the house."
    },
    "responseType": "SINGLE_CHOICE",
    "required": true,
    "maxScore": 2,
    "options": [
     {
      "id": "A",
      "code": "A",
      "content": "turn off"
     },
     {
      "id": "B",
      "code": "B",
      "content": "get off"
     },
     {
      "id": "C",
      "code": "C",
      "content": "take off"
     }
    ],
    "leftItems": [],
    "rightItems": [],
    "constraints": {},
    "answerKey": {
     "type": "SINGLE_CHOICE",
     "selectedOptionId": "C",
     "selectedOptionIds": [],
     "matches": {},
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
   "strategy": "EXACT_MATCH",
   "partialCredit": false,
   "maxScore": 2
  }
 },
 {
  "_id": "b1000000-0000-4000-8000-000000000118",
  "questionSetId": "b1000000-0000-4000-8000-000000000118",
  "revision": 1,
  "schemaVersion": 1,
  "partId": "16000000-0000-4000-8000-000000000011",
  "taskTypeCode": "GAP_FILL_CHOICE",
  "title": "The restaurant was busy, but we found a ______.",
  "instructions": "Chọn từ phù hợp để hoàn thành câu.",
  "accessLevel": "PREMIUM",
  "stimulus": null,
  "sections": [],
  "items": [
   {
    "id": "item_1",
    "sequenceNo": 1,
    "prompt": {
     "format": "PLAIN_TEXT",
     "value": "The restaurant was busy, but we found a ______."
    },
    "responseType": "SINGLE_CHOICE",
    "required": true,
    "maxScore": 2,
    "options": [
     {
      "id": "A",
      "code": "A",
      "content": "table"
     },
     {
      "id": "B",
      "code": "B",
      "content": "kitchen"
     },
     {
      "id": "C",
      "code": "C",
      "content": "meal"
     }
    ],
    "leftItems": [],
    "rightItems": [],
    "constraints": {},
    "answerKey": {
     "type": "SINGLE_CHOICE",
     "selectedOptionId": "A",
     "selectedOptionIds": [],
     "matches": {},
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
   "strategy": "EXACT_MATCH",
   "partialCredit": false,
   "maxScore": 2
  }
 },
 {
  "_id": "b1000000-0000-4000-8000-000000000119",
  "questionSetId": "b1000000-0000-4000-8000-000000000119",
  "revision": 1,
  "schemaVersion": 1,
  "partId": "16000000-0000-4000-8000-000000000011",
  "taskTypeCode": "GAP_FILL_CHOICE",
  "title": "I forgot to bring my umbrella, ______ I got wet.",
  "instructions": "Chọn từ phù hợp để hoàn thành câu.",
  "accessLevel": "PREMIUM",
  "stimulus": null,
  "sections": [],
  "items": [
   {
    "id": "item_1",
    "sequenceNo": 1,
    "prompt": {
     "format": "PLAIN_TEXT",
     "value": "I forgot to bring my umbrella, ______ I got wet."
    },
    "responseType": "SINGLE_CHOICE",
    "required": true,
    "maxScore": 2,
    "options": [
     {
      "id": "A",
      "code": "A",
      "content": "but"
     },
     {
      "id": "B",
      "code": "B",
      "content": "so"
     },
     {
      "id": "C",
      "code": "C",
      "content": "because"
     }
    ],
    "leftItems": [],
    "rightItems": [],
    "constraints": {},
    "answerKey": {
     "type": "SINGLE_CHOICE",
     "selectedOptionId": "B",
     "selectedOptionIds": [],
     "matches": {},
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
   "strategy": "EXACT_MATCH",
   "partialCredit": false,
   "maxScore": 2
  }
 },
 {
  "_id": "b1000000-0000-4000-8000-000000000120",
  "questionSetId": "b1000000-0000-4000-8000-000000000120",
  "revision": 1,
  "schemaVersion": 1,
  "partId": "16000000-0000-4000-8000-000000000011",
  "taskTypeCode": "GAP_FILL_CHOICE",
  "title": "My neighbour has a very friendly ______.",
  "instructions": "Chọn từ phù hợp để hoàn thành câu.",
  "accessLevel": "PREMIUM",
  "stimulus": null,
  "sections": [],
  "items": [
   {
    "id": "item_1",
    "sequenceNo": 1,
    "prompt": {
     "format": "PLAIN_TEXT",
     "value": "My neighbour has a very friendly ______."
    },
    "responseType": "SINGLE_CHOICE",
    "required": true,
    "maxScore": 2,
    "options": [
     {
      "id": "A",
      "code": "A",
      "content": "road"
     },
     {
      "id": "B",
      "code": "B",
      "content": "weather"
     },
     {
      "id": "C",
      "code": "C",
      "content": "dog"
     }
    ],
    "leftItems": [],
    "rightItems": [],
    "constraints": {},
    "answerKey": {
     "type": "SINGLE_CHOICE",
     "selectedOptionId": "C",
     "selectedOptionIds": [],
     "matches": {},
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
   "strategy": "EXACT_MATCH",
   "partialCredit": false,
   "maxScore": 2
  }
 },
 {
  "_id": "b1000000-0000-4000-8000-000000000121",
  "questionSetId": "b1000000-0000-4000-8000-000000000121",
  "revision": 1,
  "schemaVersion": 1,
  "partId": "16000000-0000-4000-8000-000000000011",
  "taskTypeCode": "GAP_FILL_CHOICE",
  "title": "We need more information before making a ______.",
  "instructions": "Chọn từ phù hợp để hoàn thành câu.",
  "accessLevel": "PREMIUM",
  "stimulus": null,
  "sections": [],
  "items": [
   {
    "id": "item_1",
    "sequenceNo": 1,
    "prompt": {
     "format": "PLAIN_TEXT",
     "value": "We need more information before making a ______."
    },
    "responseType": "SINGLE_CHOICE",
    "required": true,
    "maxScore": 2,
    "options": [
     {
      "id": "A",
      "code": "A",
      "content": "decision"
     },
     {
      "id": "B",
      "code": "B",
      "content": "question"
     },
     {
      "id": "C",
      "code": "C",
      "content": "conversation"
     }
    ],
    "leftItems": [],
    "rightItems": [],
    "constraints": {},
    "answerKey": {
     "type": "SINGLE_CHOICE",
     "selectedOptionId": "A",
     "selectedOptionIds": [],
     "matches": {},
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
   "strategy": "EXACT_MATCH",
   "partialCredit": false,
   "maxScore": 2
  }
 },
 {
  "_id": "b1000000-0000-4000-8000-000000000122",
  "questionSetId": "b1000000-0000-4000-8000-000000000122",
  "revision": 1,
  "schemaVersion": 1,
  "partId": "16000000-0000-4000-8000-000000000011",
  "taskTypeCode": "GAP_FILL_CHOICE",
  "title": "I will call you when I ______ home.",
  "instructions": "Chọn từ phù hợp để hoàn thành câu.",
  "accessLevel": "PREMIUM",
  "stimulus": null,
  "sections": [],
  "items": [
   {
    "id": "item_1",
    "sequenceNo": 1,
    "prompt": {
     "format": "PLAIN_TEXT",
     "value": "I will call you when I ______ home."
    },
    "responseType": "SINGLE_CHOICE",
    "required": true,
    "maxScore": 2,
    "options": [
     {
      "id": "A",
      "code": "A",
      "content": "go to"
     },
     {
      "id": "B",
      "code": "B",
      "content": "get"
     },
     {
      "id": "C",
      "code": "C",
      "content": "arrive to"
     }
    ],
    "leftItems": [],
    "rightItems": [],
    "constraints": {},
    "answerKey": {
     "type": "SINGLE_CHOICE",
     "selectedOptionId": "B",
     "selectedOptionIds": [],
     "matches": {},
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
   "strategy": "EXACT_MATCH",
   "partialCredit": false,
   "maxScore": 2
  }
 },
 {
  "_id": "b1000000-0000-4000-8000-000000000123",
  "questionSetId": "b1000000-0000-4000-8000-000000000123",
  "revision": 1,
  "schemaVersion": 1,
  "partId": "16000000-0000-4000-8000-000000000011",
  "taskTypeCode": "GAP_FILL_CHOICE",
  "title": "Can you help me ______ this box upstairs?",
  "instructions": "Chọn từ phù hợp để hoàn thành câu.",
  "accessLevel": "PREMIUM",
  "stimulus": null,
  "sections": [],
  "items": [
   {
    "id": "item_1",
    "sequenceNo": 1,
    "prompt": {
     "format": "PLAIN_TEXT",
     "value": "Can you help me ______ this box upstairs?"
    },
    "responseType": "SINGLE_CHOICE",
    "required": true,
    "maxScore": 2,
    "options": [
     {
      "id": "A",
      "code": "A",
      "content": "wear"
     },
     {
      "id": "B",
      "code": "B",
      "content": "follow"
     },
     {
      "id": "C",
      "code": "C",
      "content": "carry"
     }
    ],
    "leftItems": [],
    "rightItems": [],
    "constraints": {},
    "answerKey": {
     "type": "SINGLE_CHOICE",
     "selectedOptionId": "C",
     "selectedOptionIds": [],
     "matches": {},
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
   "strategy": "EXACT_MATCH",
   "partialCredit": false,
   "maxScore": 2
  }
 },
 {
  "_id": "b1000000-0000-4000-8000-000000000124",
  "questionSetId": "b1000000-0000-4000-8000-000000000124",
  "revision": 1,
  "schemaVersion": 1,
  "partId": "16000000-0000-4000-8000-000000000011",
  "taskTypeCode": "GAP_FILL_CHOICE",
  "title": "The supermarket is ______ the bank and the post office.",
  "instructions": "Chọn từ phù hợp để hoàn thành câu.",
  "accessLevel": "PREMIUM",
  "stimulus": null,
  "sections": [],
  "items": [
   {
    "id": "item_1",
    "sequenceNo": 1,
    "prompt": {
     "format": "PLAIN_TEXT",
     "value": "The supermarket is ______ the bank and the post office."
    },
    "responseType": "SINGLE_CHOICE",
    "required": true,
    "maxScore": 2,
    "options": [
     {
      "id": "A",
      "code": "A",
      "content": "between"
     },
     {
      "id": "B",
      "code": "B",
      "content": "through"
     },
     {
      "id": "C",
      "code": "C",
      "content": "during"
     }
    ],
    "leftItems": [],
    "rightItems": [],
    "constraints": {},
    "answerKey": {
     "type": "SINGLE_CHOICE",
     "selectedOptionId": "A",
     "selectedOptionIds": [],
     "matches": {},
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
   "strategy": "EXACT_MATCH",
   "partialCredit": false,
   "maxScore": 2
  }
 },
 {
  "_id": "b1000000-0000-4000-8000-000000000125",
  "questionSetId": "b1000000-0000-4000-8000-000000000125",
  "revision": 1,
  "schemaVersion": 1,
  "partId": "16000000-0000-4000-8000-000000000011",
  "taskTypeCode": "GAP_FILL_CHOICE",
  "title": "She always ______ notes during the lesson.",
  "instructions": "Chọn từ phù hợp để hoàn thành câu.",
  "accessLevel": "PREMIUM",
  "stimulus": null,
  "sections": [],
  "items": [
   {
    "id": "item_1",
    "sequenceNo": 1,
    "prompt": {
     "format": "PLAIN_TEXT",
     "value": "She always ______ notes during the lesson."
    },
    "responseType": "SINGLE_CHOICE",
    "required": true,
    "maxScore": 2,
    "options": [
     {
      "id": "A",
      "code": "A",
      "content": "makes"
     },
     {
      "id": "B",
      "code": "B",
      "content": "takes"
     },
     {
      "id": "C",
      "code": "C",
      "content": "writes down to"
     }
    ],
    "leftItems": [],
    "rightItems": [],
    "constraints": {},
    "answerKey": {
     "type": "SINGLE_CHOICE",
     "selectedOptionId": "B",
     "selectedOptionIds": [],
     "matches": {},
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
   "strategy": "EXACT_MATCH",
   "partialCredit": false,
   "maxScore": 2
  }
 },
 {
  "_id": "b1000000-0000-4000-8000-000000000126",
  "questionSetId": "b1000000-0000-4000-8000-000000000126",
  "revision": 1,
  "schemaVersion": 1,
  "partId": "16000000-0000-4000-8000-000000000011",
  "taskTypeCode": "GAP_FILL_CHOICE",
  "title": "I am looking ______ my keys.",
  "instructions": "Chọn từ phù hợp để hoàn thành câu.",
  "accessLevel": "PREMIUM",
  "stimulus": null,
  "sections": [],
  "items": [
   {
    "id": "item_1",
    "sequenceNo": 1,
    "prompt": {
     "format": "PLAIN_TEXT",
     "value": "I am looking ______ my keys."
    },
    "responseType": "SINGLE_CHOICE",
    "required": true,
    "maxScore": 2,
    "options": [
     {
      "id": "A",
      "code": "A",
      "content": "at"
     },
     {
      "id": "B",
      "code": "B",
      "content": "from"
     },
     {
      "id": "C",
      "code": "C",
      "content": "for"
     }
    ],
    "leftItems": [],
    "rightItems": [],
    "constraints": {},
    "answerKey": {
     "type": "SINGLE_CHOICE",
     "selectedOptionId": "C",
     "selectedOptionIds": [],
     "matches": {},
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
   "strategy": "EXACT_MATCH",
   "partialCredit": false,
   "maxScore": 2
  }
 },
 {
  "_id": "b1000000-0000-4000-8000-000000000127",
  "questionSetId": "b1000000-0000-4000-8000-000000000127",
  "revision": 1,
  "schemaVersion": 1,
  "partId": "16000000-0000-4000-8000-000000000011",
  "taskTypeCode": "GAP_FILL_CHOICE",
  "title": "Please turn ______ the lights before you leave.",
  "instructions": "Chọn từ phù hợp để hoàn thành câu.",
  "accessLevel": "PREMIUM",
  "stimulus": null,
  "sections": [],
  "items": [
   {
    "id": "item_1",
    "sequenceNo": 1,
    "prompt": {
     "format": "PLAIN_TEXT",
     "value": "Please turn ______ the lights before you leave."
    },
    "responseType": "SINGLE_CHOICE",
    "required": true,
    "maxScore": 2,
    "options": [
     {
      "id": "A",
      "code": "A",
      "content": "off"
     },
     {
      "id": "B",
      "code": "B",
      "content": "over"
     },
     {
      "id": "C",
      "code": "C",
      "content": "away"
     }
    ],
    "leftItems": [],
    "rightItems": [],
    "constraints": {},
    "answerKey": {
     "type": "SINGLE_CHOICE",
     "selectedOptionId": "A",
     "selectedOptionIds": [],
     "matches": {},
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
   "strategy": "EXACT_MATCH",
   "partialCredit": false,
   "maxScore": 2
  }
 },
 {
  "_id": "b1000000-0000-4000-8000-000000000128",
  "questionSetId": "b1000000-0000-4000-8000-000000000128",
  "revision": 1,
  "schemaVersion": 1,
  "partId": "16000000-0000-4000-8000-000000000011",
  "taskTypeCode": "GAP_FILL_CHOICE",
  "title": "We had a great ______ at the beach.",
  "instructions": "Chọn từ phù hợp để hoàn thành câu.",
  "accessLevel": "PREMIUM",
  "stimulus": null,
  "sections": [],
  "items": [
   {
    "id": "item_1",
    "sequenceNo": 1,
    "prompt": {
     "format": "PLAIN_TEXT",
     "value": "We had a great ______ at the beach."
    },
    "responseType": "SINGLE_CHOICE",
    "required": true,
    "maxScore": 2,
    "options": [
     {
      "id": "A",
      "code": "A",
      "content": "clock"
     },
     {
      "id": "B",
      "code": "B",
      "content": "time"
     },
     {
      "id": "C",
      "code": "C",
      "content": "hour"
     }
    ],
    "leftItems": [],
    "rightItems": [],
    "constraints": {},
    "answerKey": {
     "type": "SINGLE_CHOICE",
     "selectedOptionId": "B",
     "selectedOptionIds": [],
     "matches": {},
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
   "strategy": "EXACT_MATCH",
   "partialCredit": false,
   "maxScore": 2
  }
 },
 {
  "_id": "b1000000-0000-4000-8000-000000000129",
  "questionSetId": "b1000000-0000-4000-8000-000000000129",
  "revision": 1,
  "schemaVersion": 1,
  "partId": "16000000-0000-4000-8000-000000000011",
  "taskTypeCode": "GAP_FILL_CHOICE",
  "title": "My father usually ______ to work by car.",
  "instructions": "Chọn từ phù hợp để hoàn thành câu.",
  "accessLevel": "PREMIUM",
  "stimulus": null,
  "sections": [],
  "items": [
   {
    "id": "item_1",
    "sequenceNo": 1,
    "prompt": {
     "format": "PLAIN_TEXT",
     "value": "My father usually ______ to work by car."
    },
    "responseType": "SINGLE_CHOICE",
    "required": true,
    "maxScore": 2,
    "options": [
     {
      "id": "A",
      "code": "A",
      "content": "rides"
     },
     {
      "id": "B",
      "code": "B",
      "content": "walks on"
     },
     {
      "id": "C",
      "code": "C",
      "content": "drives"
     }
    ],
    "leftItems": [],
    "rightItems": [],
    "constraints": {},
    "answerKey": {
     "type": "SINGLE_CHOICE",
     "selectedOptionId": "C",
     "selectedOptionIds": [],
     "matches": {},
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
   "strategy": "EXACT_MATCH",
   "partialCredit": false,
   "maxScore": 2
  }
 },
 {
  "_id": "b1000000-0000-4000-8000-000000000130",
  "questionSetId": "b1000000-0000-4000-8000-000000000130",
  "revision": 1,
  "schemaVersion": 1,
  "partId": "16000000-0000-4000-8000-000000000011",
  "taskTypeCode": "GAP_FILL_CHOICE",
  "title": "The soup is too ______ to eat now.",
  "instructions": "Chọn từ phù hợp để hoàn thành câu.",
  "accessLevel": "PREMIUM",
  "stimulus": null,
  "sections": [],
  "items": [
   {
    "id": "item_1",
    "sequenceNo": 1,
    "prompt": {
     "format": "PLAIN_TEXT",
     "value": "The soup is too ______ to eat now."
    },
    "responseType": "SINGLE_CHOICE",
    "required": true,
    "maxScore": 2,
    "options": [
     {
      "id": "A",
      "code": "A",
      "content": "hot"
     },
     {
      "id": "B",
      "code": "B",
      "content": "fast"
     },
     {
      "id": "C",
      "code": "C",
      "content": "deep"
     }
    ],
    "leftItems": [],
    "rightItems": [],
    "constraints": {},
    "answerKey": {
     "type": "SINGLE_CHOICE",
     "selectedOptionId": "A",
     "selectedOptionIds": [],
     "matches": {},
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
   "strategy": "EXACT_MATCH",
   "partialCredit": false,
   "maxScore": 2
  }
 },
 {
  "_id": "b1000000-0000-4000-8000-000000000131",
  "questionSetId": "b1000000-0000-4000-8000-000000000131",
  "revision": 1,
  "schemaVersion": 1,
  "partId": "16000000-0000-4000-8000-000000000011",
  "taskTypeCode": "GAP_FILL_CHOICE",
  "title": "I need to ______ some money from the bank.",
  "instructions": "Chọn từ phù hợp để hoàn thành câu.",
  "accessLevel": "PREMIUM",
  "stimulus": null,
  "sections": [],
  "items": [
   {
    "id": "item_1",
    "sequenceNo": 1,
    "prompt": {
     "format": "PLAIN_TEXT",
     "value": "I need to ______ some money from the bank."
    },
    "responseType": "SINGLE_CHOICE",
    "required": true,
    "maxScore": 2,
    "options": [
     {
      "id": "A",
      "code": "A",
      "content": "remove"
     },
     {
      "id": "B",
      "code": "B",
      "content": "withdraw"
     },
     {
      "id": "C",
      "code": "C",
      "content": "carry"
     }
    ],
    "leftItems": [],
    "rightItems": [],
    "constraints": {},
    "answerKey": {
     "type": "SINGLE_CHOICE",
     "selectedOptionId": "B",
     "selectedOptionIds": [],
     "matches": {},
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
   "strategy": "EXACT_MATCH",
   "partialCredit": false,
   "maxScore": 2
  }
 },
 {
  "_id": "b1000000-0000-4000-8000-000000000132",
  "questionSetId": "b1000000-0000-4000-8000-000000000132",
  "revision": 1,
  "schemaVersion": 1,
  "partId": "16000000-0000-4000-8000-000000000011",
  "taskTypeCode": "GAP_FILL_CHOICE",
  "title": "The film starts ______ eight o'clock.",
  "instructions": "Chọn từ phù hợp để hoàn thành câu.",
  "accessLevel": "PREMIUM",
  "stimulus": null,
  "sections": [],
  "items": [
   {
    "id": "item_1",
    "sequenceNo": 1,
    "prompt": {
     "format": "PLAIN_TEXT",
     "value": "The film starts ______ eight o'clock."
    },
    "responseType": "SINGLE_CHOICE",
    "required": true,
    "maxScore": 2,
    "options": [
     {
      "id": "A",
      "code": "A",
      "content": "in"
     },
     {
      "id": "B",
      "code": "B",
      "content": "on"
     },
     {
      "id": "C",
      "code": "C",
      "content": "at"
     }
    ],
    "leftItems": [],
    "rightItems": [],
    "constraints": {},
    "answerKey": {
     "type": "SINGLE_CHOICE",
     "selectedOptionId": "C",
     "selectedOptionIds": [],
     "matches": {},
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
   "strategy": "EXACT_MATCH",
   "partialCredit": false,
   "maxScore": 2
  }
 },
 {
  "_id": "b1000000-0000-4000-8000-000000000133",
  "questionSetId": "b1000000-0000-4000-8000-000000000133",
  "revision": 1,
  "schemaVersion": 1,
  "partId": "16000000-0000-4000-8000-000000000011",
  "taskTypeCode": "GAP_FILL_CHOICE",
  "title": "She was tired, ______ she went to bed early.",
  "instructions": "Chọn từ phù hợp để hoàn thành câu.",
  "accessLevel": "PREMIUM",
  "stimulus": null,
  "sections": [],
  "items": [
   {
    "id": "item_1",
    "sequenceNo": 1,
    "prompt": {
     "format": "PLAIN_TEXT",
     "value": "She was tired, ______ she went to bed early."
    },
    "responseType": "SINGLE_CHOICE",
    "required": true,
    "maxScore": 2,
    "options": [
     {
      "id": "A",
      "code": "A",
      "content": "so"
     },
     {
      "id": "B",
      "code": "B",
      "content": "but"
     },
     {
      "id": "C",
      "code": "C",
      "content": "or"
     }
    ],
    "leftItems": [],
    "rightItems": [],
    "constraints": {},
    "answerKey": {
     "type": "SINGLE_CHOICE",
     "selectedOptionId": "A",
     "selectedOptionIds": [],
     "matches": {},
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
   "strategy": "EXACT_MATCH",
   "partialCredit": false,
   "maxScore": 2
  }
 },
 {
  "_id": "b1000000-0000-4000-8000-000000000134",
  "questionSetId": "b1000000-0000-4000-8000-000000000134",
  "revision": 1,
  "schemaVersion": 1,
  "partId": "16000000-0000-4000-8000-000000000011",
  "taskTypeCode": "GAP_FILL_CHOICE",
  "title": "Could you ______ the door, please?",
  "instructions": "Chọn từ phù hợp để hoàn thành câu.",
  "accessLevel": "PREMIUM",
  "stimulus": null,
  "sections": [],
  "items": [
   {
    "id": "item_1",
    "sequenceNo": 1,
    "prompt": {
     "format": "PLAIN_TEXT",
     "value": "Could you ______ the door, please?"
    },
    "responseType": "SINGLE_CHOICE",
    "required": true,
    "maxScore": 2,
    "options": [
     {
      "id": "A",
      "code": "A",
      "content": "start"
     },
     {
      "id": "B",
      "code": "B",
      "content": "open"
     },
     {
      "id": "C",
      "code": "C",
      "content": "begin"
     }
    ],
    "leftItems": [],
    "rightItems": [],
    "constraints": {},
    "answerKey": {
     "type": "SINGLE_CHOICE",
     "selectedOptionId": "B",
     "selectedOptionIds": [],
     "matches": {},
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
   "strategy": "EXACT_MATCH",
   "partialCredit": false,
   "maxScore": 2
  }
 },
 {
  "_id": "b1000000-0000-4000-8000-000000000135",
  "questionSetId": "b1000000-0000-4000-8000-000000000135",
  "revision": 1,
  "schemaVersion": 1,
  "partId": "16000000-0000-4000-8000-000000000011",
  "taskTypeCode": "GAP_FILL_CHOICE",
  "title": "I have lived here ______ three years.",
  "instructions": "Chọn từ phù hợp để hoàn thành câu.",
  "accessLevel": "PREMIUM",
  "stimulus": null,
  "sections": [],
  "items": [
   {
    "id": "item_1",
    "sequenceNo": 1,
    "prompt": {
     "format": "PLAIN_TEXT",
     "value": "I have lived here ______ three years."
    },
    "responseType": "SINGLE_CHOICE",
    "required": true,
    "maxScore": 2,
    "options": [
     {
      "id": "A",
      "code": "A",
      "content": "since"
     },
     {
      "id": "B",
      "code": "B",
      "content": "from"
     },
     {
      "id": "C",
      "code": "C",
      "content": "for"
     }
    ],
    "leftItems": [],
    "rightItems": [],
    "constraints": {},
    "answerKey": {
     "type": "SINGLE_CHOICE",
     "selectedOptionId": "C",
     "selectedOptionIds": [],
     "matches": {},
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
   "strategy": "EXACT_MATCH",
   "partialCredit": false,
   "maxScore": 2
  }
 },
 {
  "_id": "b1000000-0000-4000-8000-000000000136",
  "questionSetId": "b1000000-0000-4000-8000-000000000136",
  "revision": 1,
  "schemaVersion": 1,
  "partId": "16000000-0000-4000-8000-000000000011",
  "taskTypeCode": "GAP_FILL_CHOICE",
  "title": "We usually have lunch in the office ______.",
  "instructions": "Chọn từ phù hợp để hoàn thành câu.",
  "accessLevel": "PREMIUM",
  "stimulus": null,
  "sections": [],
  "items": [
   {
    "id": "item_1",
    "sequenceNo": 1,
    "prompt": {
     "format": "PLAIN_TEXT",
     "value": "We usually have lunch in the office ______."
    },
    "responseType": "SINGLE_CHOICE",
    "required": true,
    "maxScore": 2,
    "options": [
     {
      "id": "A",
      "code": "A",
      "content": "canteen"
     },
     {
      "id": "B",
      "code": "B",
      "content": "bedroom"
     },
     {
      "id": "C",
      "code": "C",
      "content": "garage"
     }
    ],
    "leftItems": [],
    "rightItems": [],
    "constraints": {},
    "answerKey": {
     "type": "SINGLE_CHOICE",
     "selectedOptionId": "A",
     "selectedOptionIds": [],
     "matches": {},
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
   "strategy": "EXACT_MATCH",
   "partialCredit": false,
   "maxScore": 2
  }
 },
 {
  "_id": "b1000000-0000-4000-8000-000000000137",
  "questionSetId": "b1000000-0000-4000-8000-000000000137",
  "revision": 1,
  "schemaVersion": 1,
  "partId": "16000000-0000-4000-8000-000000000011",
  "taskTypeCode": "GAP_FILL_CHOICE",
  "title": "My train was late, so I missed the ______.",
  "instructions": "Chọn từ phù hợp để hoàn thành câu.",
  "accessLevel": "PREMIUM",
  "stimulus": null,
  "sections": [],
  "items": [
   {
    "id": "item_1",
    "sequenceNo": 1,
    "prompt": {
     "format": "PLAIN_TEXT",
     "value": "My train was late, so I missed the ______."
    },
    "responseType": "SINGLE_CHOICE",
    "required": true,
    "maxScore": 2,
    "options": [
     {
      "id": "A",
      "code": "A",
      "content": "weather"
     },
     {
      "id": "B",
      "code": "B",
      "content": "meeting"
     },
     {
      "id": "C",
      "code": "C",
      "content": "street"
     }
    ],
    "leftItems": [],
    "rightItems": [],
    "constraints": {},
    "answerKey": {
     "type": "SINGLE_CHOICE",
     "selectedOptionId": "B",
     "selectedOptionIds": [],
     "matches": {},
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
   "strategy": "EXACT_MATCH",
   "partialCredit": false,
   "maxScore": 2
  }
 },
 {
  "_id": "b1000000-0000-4000-8000-000000000138",
  "questionSetId": "b1000000-0000-4000-8000-000000000138",
  "revision": 1,
  "schemaVersion": 1,
  "partId": "16000000-0000-4000-8000-000000000011",
  "taskTypeCode": "GAP_FILL_CHOICE",
  "title": "Please ______ your answer on the form.",
  "instructions": "Chọn từ phù hợp để hoàn thành câu.",
  "accessLevel": "PREMIUM",
  "stimulus": null,
  "sections": [],
  "items": [
   {
    "id": "item_1",
    "sequenceNo": 1,
    "prompt": {
     "format": "PLAIN_TEXT",
     "value": "Please ______ your answer on the form."
    },
    "responseType": "SINGLE_CHOICE",
    "required": true,
    "maxScore": 2,
    "options": [
     {
      "id": "A",
      "code": "A",
      "content": "draw"
     },
     {
      "id": "B",
      "code": "B",
      "content": "speak"
     },
     {
      "id": "C",
      "code": "C",
      "content": "write"
     }
    ],
    "leftItems": [],
    "rightItems": [],
    "constraints": {},
    "answerKey": {
     "type": "SINGLE_CHOICE",
     "selectedOptionId": "C",
     "selectedOptionIds": [],
     "matches": {},
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
   "strategy": "EXACT_MATCH",
   "partialCredit": false,
   "maxScore": 2
  }
 },
 {
  "_id": "b1000000-0000-4000-8000-000000000139",
  "questionSetId": "b1000000-0000-4000-8000-000000000139",
  "revision": 1,
  "schemaVersion": 1,
  "partId": "16000000-0000-4000-8000-000000000011",
  "taskTypeCode": "GAP_FILL_CHOICE",
  "title": "The hotel room was clean and ______.",
  "instructions": "Chọn từ phù hợp để hoàn thành câu.",
  "accessLevel": "PREMIUM",
  "stimulus": null,
  "sections": [],
  "items": [
   {
    "id": "item_1",
    "sequenceNo": 1,
    "prompt": {
     "format": "PLAIN_TEXT",
     "value": "The hotel room was clean and ______."
    },
    "responseType": "SINGLE_CHOICE",
    "required": true,
    "maxScore": 2,
    "options": [
     {
      "id": "A",
      "code": "A",
      "content": "comfortable"
     },
     {
      "id": "B",
      "code": "B",
      "content": "hungry"
     },
     {
      "id": "C",
      "code": "C",
      "content": "angry"
     }
    ],
    "leftItems": [],
    "rightItems": [],
    "constraints": {},
    "answerKey": {
     "type": "SINGLE_CHOICE",
     "selectedOptionId": "A",
     "selectedOptionIds": [],
     "matches": {},
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
   "strategy": "EXACT_MATCH",
   "partialCredit": false,
   "maxScore": 2
  }
 },
 {
  "_id": "b1000000-0000-4000-8000-000000000140",
  "questionSetId": "b1000000-0000-4000-8000-000000000140",
  "revision": 1,
  "schemaVersion": 1,
  "partId": "16000000-0000-4000-8000-000000000011",
  "taskTypeCode": "GAP_FILL_CHOICE",
  "title": "I need a new ______ because mine is broken.",
  "instructions": "Chọn từ phù hợp để hoàn thành câu.",
  "accessLevel": "PREMIUM",
  "stimulus": null,
  "sections": [],
  "items": [
   {
    "id": "item_1",
    "sequenceNo": 1,
    "prompt": {
     "format": "PLAIN_TEXT",
     "value": "I need a new ______ because mine is broken."
    },
    "responseType": "SINGLE_CHOICE",
    "required": true,
    "maxScore": 2,
    "options": [
     {
      "id": "A",
      "code": "A",
      "content": "rain"
     },
     {
      "id": "B",
      "code": "B",
      "content": "phone"
     },
     {
      "id": "C",
      "code": "C",
      "content": "music"
     }
    ],
    "leftItems": [],
    "rightItems": [],
    "constraints": {},
    "answerKey": {
     "type": "SINGLE_CHOICE",
     "selectedOptionId": "B",
     "selectedOptionIds": [],
     "matches": {},
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
   "strategy": "EXACT_MATCH",
   "partialCredit": false,
   "maxScore": 2
  }
 },
 {
  "_id": "b1000000-0000-4000-8000-000000000141",
  "questionSetId": "b1000000-0000-4000-8000-000000000141",
  "revision": 1,
  "schemaVersion": 1,
  "partId": "16000000-0000-4000-8000-000000000011",
  "taskTypeCode": "GAP_FILL_CHOICE",
  "title": "She ______ her homework before dinner.",
  "instructions": "Chọn từ phù hợp để hoàn thành câu.",
  "accessLevel": "PREMIUM",
  "stimulus": null,
  "sections": [],
  "items": [
   {
    "id": "item_1",
    "sequenceNo": 1,
    "prompt": {
     "format": "PLAIN_TEXT",
     "value": "She ______ her homework before dinner."
    },
    "responseType": "SINGLE_CHOICE",
    "required": true,
    "maxScore": 2,
    "options": [
     {
      "id": "A",
      "code": "A",
      "content": "closed"
     },
     {
      "id": "B",
      "code": "B",
      "content": "stopped at"
     },
     {
      "id": "C",
      "code": "C",
      "content": "finished"
     }
    ],
    "leftItems": [],
    "rightItems": [],
    "constraints": {},
    "answerKey": {
     "type": "SINGLE_CHOICE",
     "selectedOptionId": "C",
     "selectedOptionIds": [],
     "matches": {},
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
   "strategy": "EXACT_MATCH",
   "partialCredit": false,
   "maxScore": 2
  }
 },
 {
  "_id": "b1000000-0000-4000-8000-000000000142",
  "questionSetId": "b1000000-0000-4000-8000-000000000142",
  "revision": 1,
  "schemaVersion": 1,
  "partId": "16000000-0000-4000-8000-000000000011",
  "taskTypeCode": "GAP_FILL_CHOICE",
  "title": "We are going to ______ our grandparents this weekend.",
  "instructions": "Chọn từ phù hợp để hoàn thành câu.",
  "accessLevel": "PREMIUM",
  "stimulus": null,
  "sections": [],
  "items": [
   {
    "id": "item_1",
    "sequenceNo": 1,
    "prompt": {
     "format": "PLAIN_TEXT",
     "value": "We are going to ______ our grandparents this weekend."
    },
    "responseType": "SINGLE_CHOICE",
    "required": true,
    "maxScore": 2,
    "options": [
     {
      "id": "A",
      "code": "A",
      "content": "visit"
     },
     {
      "id": "B",
      "code": "B",
      "content": "watch"
     },
     {
      "id": "C",
      "code": "C",
      "content": "look"
     }
    ],
    "leftItems": [],
    "rightItems": [],
    "constraints": {},
    "answerKey": {
     "type": "SINGLE_CHOICE",
     "selectedOptionId": "A",
     "selectedOptionIds": [],
     "matches": {},
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
   "strategy": "EXACT_MATCH",
   "partialCredit": false,
   "maxScore": 2
  }
 },
 {
  "_id": "b1000000-0000-4000-8000-000000000143",
  "questionSetId": "b1000000-0000-4000-8000-000000000143",
  "revision": 1,
  "schemaVersion": 1,
  "partId": "16000000-0000-4000-8000-000000000011",
  "taskTypeCode": "GAP_FILL_CHOICE",
  "title": "Please be quiet. The baby is ______.",
  "instructions": "Chọn từ phù hợp để hoàn thành câu.",
  "accessLevel": "PREMIUM",
  "stimulus": null,
  "sections": [],
  "items": [
   {
    "id": "item_1",
    "sequenceNo": 1,
    "prompt": {
     "format": "PLAIN_TEXT",
     "value": "Please be quiet. The baby is ______."
    },
    "responseType": "SINGLE_CHOICE",
    "required": true,
    "maxScore": 2,
    "options": [
     {
      "id": "A",
      "code": "A",
      "content": "running"
     },
     {
      "id": "B",
      "code": "B",
      "content": "sleeping"
     },
     {
      "id": "C",
      "code": "C",
      "content": "driving"
     }
    ],
    "leftItems": [],
    "rightItems": [],
    "constraints": {},
    "answerKey": {
     "type": "SINGLE_CHOICE",
     "selectedOptionId": "B",
     "selectedOptionIds": [],
     "matches": {},
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
   "strategy": "EXACT_MATCH",
   "partialCredit": false,
   "maxScore": 2
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
print('Da upsert ' + n + ' de Reading Part 1');
print('Tong de Part 1 trong Mongo = ' +
  target.question_set_documents.countDocuments({ partId: '16000000-0000-4000-8000-000000000011' }));
