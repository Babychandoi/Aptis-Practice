// SINH TỰ ĐỘNG bằng: node scripts/gen-writing-part3-titles.js
const target = db.getSiblingDB('aptis');
const PAIRS = [
 {
  "id": "3ac92ca1-ee14-4ff9-9091-b6059f4c1fde",
  "title": "Nature Club"
 },
 {
  "id": "9a09fd4b-9025-4537-9f11-e3eb03a06e5c",
  "title": "Outdoor Club"
 },
 {
  "id": "2b2c98f0-cae4-49a1-916d-79f5d8e2eeb0",
  "title": "Debate Club"
 },
 {
  "id": "7ff5d710-306d-4424-952a-17038a6d8e45",
  "title": "Book Club"
 },
 {
  "id": "446605bb-698d-4a1a-8cd4-f5fc647b6d8a",
  "title": "Home Living Club"
 },
 {
  "id": "6b462ffd-5b1a-4fb4-a0c3-3acbe7f97b7f",
  "title": "Art Club"
 },
 {
  "id": "6ff4d6d2-2afe-4c10-a148-abfe093dd421",
  "title": "Film Club"
 },
 {
  "id": "0c4239f3-3254-4419-90ad-d2221c7f57e3",
  "title": "Language Club (Version 1)"
 },
 {
  "id": "38a3dade-ef3d-4ab3-b01d-da86191a74c2",
  "title": "Writing Club"
 },
 {
  "id": "bdaaaf6e-74db-4040-a14b-08db3287126a",
  "title": "English Club (Version 1)"
 },
 {
  "id": "3ba9bba1-d8ac-477e-84ee-5af1c8a48c18",
  "title": "Television Club"
 },
 {
  "id": "29e5819b-3943-4eea-9120-5be4b9ffba41",
  "title": "Beautiful Homes Club"
 },
 {
  "id": "285f0fa2-e46b-445a-b867-4a8994dc8bb7",
  "title": "Garden Club"
 },
 {
  "id": "c530669b-69ae-46d8-8a7a-7d70be5f5100",
  "title": "Food Club"
 },
 {
  "id": "79ef072d-97ea-4db0-9b84-c67a6b6793d0",
  "title": "Language Club (Version 2)"
 },
 {
  "id": "98a4ab72-3f36-4c9d-b74a-eeb5d22fcd4d",
  "title": "English Club (Version 2)"
 },
 {
  "id": "70ed66d6-39b5-407b-8794-d8bc76b3b760",
  "title": "Cinema Club"
 },
 {
  "id": "bbca0053-65a0-4600-afc2-70188b8be5b8",
  "title": "Nature Club (Version 2)"
 },
 {
  "id": "4c541a12-16b7-452c-96e5-721c0a511403",
  "title": "Sports Club"
 },
 {
  "id": "7f45dd28-1fb3-40f1-aef6-d8f4fe1726c9",
  "title": "Reading Club (partial)"
 },
 {
  "id": "cf0e27bd-6c50-4d53-8f61-4b030c545171",
  "title": "English Club V3 – Confidence, Guests and Club Rules"
 },
 {
  "id": "12a61f16-9294-4d32-a5ea-fbd9c7c0e3a9",
  "title": "Fashion Club"
 },
 {
  "id": "22347695-6019-4af2-82d1-ae1a42141a25",
  "title": "Photography Club"
 },
 {
  "id": "8b2dad69-6831-4d6a-af4a-d31ac12fa087",
  "title": "Technology Club"
 },
 {
  "id": "9d3fdefa-4595-4de7-bd3b-a806ef4da950",
  "title": "Business Club"
 },
 {
  "id": "ebb72c3d-ce2a-4069-9f69-2f8eaea62970",
  "title": "Museum Club"
 },
 {
  "id": "0d9c3cb7-76fc-48f4-bab0-3fb10984fb50",
  "title": "Movie Club"
 },
 {
  "id": "945d54cf-1b00-4d4e-bed6-773937b2671b",
  "title": "Computer Club"
 },
 {
  "id": "c20359e5-623a-4b93-bb81-459ec96efdaf",
  "title": "College Club"
 },
 {
  "id": "a0fb89be-2aaa-4c03-9d76-c064b8ce235d",
  "title": "English Club (Version 2)"
 },
 {
  "id": "18bfd99c-8725-4414-ab44-e56af3f34fb8",
  "title": "Walking Club (Version 1)"
 },
 {
  "id": "4ca13f16-dba7-47d1-ba45-cff4ccd0b935",
  "title": "Community Club"
 },
 {
  "id": "be6dcb16-6e98-4fb9-ab08-52610d821d81",
  "title": "Travel Club (Version 2)"
 },
 {
  "id": "2cc81635-1283-4654-b252-faa2798feea5",
  "title": "Cooking Club"
 },
 {
  "id": "6fa21eb6-1bb9-47bd-afbe-cc3ed32cb654",
  "title": "Car Club"
 },
 {
  "id": "7b31f8ca-b87a-448e-b0da-d4a6f3cf8900",
  "title": "Travel Club"
 },
 {
  "id": "c864c31c-4f05-45e2-8b3a-03e90894f823",
  "title": "Social Club"
 },
 {
  "id": "a3f43b9a-5fa3-47bc-833e-d9fa5a22417e",
  "title": "Home Living – Shared Spaces, Neighbourhoods and Heritage"
 },
 {
  "id": "56530330-67df-4f88-8f3a-9c9c7c54e5aa",
  "title": "Music Club"
 },
 {
  "id": "6d0255e3-4d23-40d4-8e27-fcd30b98f6bc",
  "title": "Science Club"
 },
 {
  "id": "a425e307-4905-4a3f-b1d9-334ee727ed6e",
  "title": "Fitness Club"
 },
 {
  "id": "d5ea2b81-ee1b-45b8-8c84-227868b6014d",
  "title": "Healthy Club"
 },
 {
  "id": "656d6353-c962-489c-9d2d-eb35b5e07324",
  "title": "Fitness Club – Flexible Exercise and Workplace Health"
 },
 {
  "id": "34e70868-01bf-46c6-a6f2-f2202d33f67d",
  "title": "Technology Club – Focus, Backups and Responsible AI"
 },
 {
  "id": "4479e12b-e02f-47b4-8dbb-d987351a392d",
  "title": "Walking Club V2 – Routes, Safety and Community"
 },
 {
  "id": "1c4e94cd-73ed-44ed-b40c-102221deb359",
  "title": "Food Club (Version 2)"
 }
];

let n = 0;
PAIRS.forEach(function (entry) {
  const r = target.question_set_documents.updateOne(
    { _id: entry.id }, { $set: { title: entry.title, updatedAt: new Date() } });
  n += r.modifiedCount;
});
print('Da doi tieu de ' + n + '/' + PAIRS.length + ' de Writing Part 3');
