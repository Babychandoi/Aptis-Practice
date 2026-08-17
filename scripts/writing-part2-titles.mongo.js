// SINH TỰ ĐỘNG bằng: node scripts/gen-writing-part2-titles.js
const target = db.getSiblingDB('aptis');
const PAIRS = [
 {
  "id": "a567930a-24d2-4064-bd5e-43db446ec2b0",
  "title": "Travel Club"
 },
 {
  "id": "f5334db1-fb13-40a7-bc95-fb01148499ef",
  "title": "Fashion Club"
 },
 {
  "id": "f8079e54-0b5e-452c-a0dd-2dd81c88d69b",
  "title": "Language Club (Version 1)"
 },
 {
  "id": "427579af-e4ae-4242-88fb-cb34932a7704",
  "title": "Computer Club"
 },
 {
  "id": "93477ceb-2452-4c16-9441-905659419e03",
  "title": "Language Club (Version 2)"
 },
 {
  "id": "dd9c2be6-124f-43b8-bee4-41275f79e7cc",
  "title": "College Club"
 },
 {
  "id": "ed26531c-254b-4cfa-a676-2b07fd33a088",
  "title": "Social Club"
 },
 {
  "id": "ec040a5c-dbe3-4a95-b1d7-2b33899a0765",
  "title": "Nature Club (Version 2)"
 },
 {
  "id": "d134abb0-5234-484b-8010-e64a51fa1698",
  "title": "Debate Club"
 },
 {
  "id": "55e71bb3-a6bf-43bb-9bf1-ef02214cd303",
  "title": "Science Club"
 },
 {
  "id": "4839b76d-fd88-4803-8c6f-0f8c65db0627",
  "title": "Cooking Club"
 },
 {
  "id": "4a205431-a13b-469f-be0d-7de495cdac46",
  "title": "English Club (Version 2)"
 },
 {
  "id": "8cb5500d-b7ef-4bbf-b5cf-6c2219b5a4f5",
  "title": "English Club V2 – Improving Speaking Skills"
 },
 {
  "id": "0d66bfab-2d90-4c97-832e-37693ef6975e",
  "title": "Nature Club"
 },
 {
  "id": "be0bf901-fe5f-4923-9a6f-37f99d79da05",
  "title": "Healthy Club"
 },
 {
  "id": "863fb96f-191c-4f9e-971f-db0bc5292809",
  "title": "Movie Club – A Film Recommendation"
 },
 {
  "id": "7336fbf0-b0fd-4224-9c45-2299b93e6e36",
  "title": "Walking Club (Version 1)"
 },
 {
  "id": "7f031f50-d029-4733-88b6-7bfac9beea9f",
  "title": "Reading Club"
 },
 {
  "id": "b6db7565-5f64-4fd1-9e69-ffefd63b2b6f",
  "title": "Business Club"
 },
 {
  "id": "7ecf0af2-4bf7-4d9a-a56c-a9922d0e0cd6",
  "title": "Cinema Club"
 },
 {
  "id": "915e26b0-5050-419b-b45a-01afbef4dd1d",
  "title": "Food Club"
 },
 {
  "id": "546b4d1e-6026-4bcd-87c3-f899c679b361",
  "title": "Photography Club"
 },
 {
  "id": "668a4b36-f480-41f0-b2e8-de524a17e1a5",
  "title": "Writing Club"
 },
 {
  "id": "6e1a7c83-4eb6-41f5-8c66-3c804cdfdb7c",
  "title": "English Club (Version 1)"
 },
 {
  "id": "e4dc04f5-ef85-4ba3-be76-fedf54cd587b",
  "title": "Travel Club (Version 2)"
 },
 {
  "id": "fe79c666-9204-42f4-82e4-462daa59a1ab",
  "title": "Home Living Club – My Most Used Room"
 },
 {
  "id": "4b140f10-3451-4f2b-9d9a-26952a9b8c7a",
  "title": "Technology Club"
 },
 {
  "id": "5b09fcb4-8350-46ec-9d01-05001850beed",
  "title": "Beautiful Homes Club"
 },
 {
  "id": "b08fa8e2-8e39-40e8-a8cf-ac37c3e09217",
  "title": "Fitness Club"
 },
 {
  "id": "3e8563d1-a627-4f83-be59-8ba898a4ba25",
  "title": "English Club (Version 3)"
 },
 {
  "id": "56a2377c-5fba-459e-953e-c6d4c1ae89da",
  "title": "Television Club"
 },
 {
  "id": "478daab4-c2f3-416b-b3c7-ec4606568909",
  "title": "Art Club"
 },
 {
  "id": "1610a406-fdd0-4800-b02e-f254d5e75cd2",
  "title": "Garden Club"
 },
 {
  "id": "465a34de-a2d3-458f-82be-a1505ce825aa",
  "title": "Outdoor Club"
 },
 {
  "id": "04afd4a9-57e5-45bc-8ab2-837dc73c228c",
  "title": "Film Club"
 },
 {
  "id": "af5f615e-09df-4a2a-abc6-cb636da6b496",
  "title": "Museum Club"
 },
 {
  "id": "ccc5ab76-64f1-4aac-922c-0153cb9e0c42",
  "title": "Sports Club"
 },
 {
  "id": "afd5599e-4569-4bc0-bacb-a8ea8941e536",
  "title": "Music Club"
 },
 {
  "id": "5b946f28-cadd-4b0a-9231-a88e803842fd",
  "title": "Book Club"
 },
 {
  "id": "90bbecb1-b31d-4a9f-adb7-aaf697839f83",
  "title": "Car Club"
 },
 {
  "id": "29c61b91-1a5d-4280-8629-63885becc9a5",
  "title": "Home Living"
 },
 {
  "id": "3008a006-e868-457c-a564-96fb314c3fd5",
  "title": "Fitness Club – A New Healthy Habit"
 },
 {
  "id": "d2b29fa3-65ea-423b-bb3c-7e265b851433",
  "title": "Technology Club – Organising Study Online"
 },
 {
  "id": "c351ff34-6a68-4c5c-ae45-ada02020f001",
  "title": "Walking Club V2 – A Recommended Route"
 },
 {
  "id": "981423f5-695c-42e8-b9e4-71c7ae81ddc2",
  "title": "Community Club"
 },
 {
  "id": "5535f9e6-4119-4399-a898-9a738e8724be",
  "title": "Food Club (Version 2)"
 }
];

let n = 0;
PAIRS.forEach(function (entry) {
  const r = target.question_set_documents.updateOne(
    { _id: entry.id }, { $set: { title: entry.title, updatedAt: new Date() } });
  n += r.modifiedCount;
});
print('Da doi tieu de ' + n + '/' + PAIRS.length + ' de Writing Part 2');
