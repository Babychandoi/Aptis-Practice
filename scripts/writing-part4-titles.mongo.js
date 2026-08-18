// SINH TỰ ĐỘNG bằng: node scripts/gen-writing-part4-titles.js
const target = db.getSiblingDB('aptis');
const PAIRS = [
 {
  "id": "d333b97c-0435-4ad5-ada2-b995a7a62003",
  "title": "Fashion Club"
 },
 {
  "id": "7a6e5192-644d-42b7-b9d1-7eca2b246d19",
  "title": "Social Club"
 },
 {
  "id": "fd679d05-a349-43a7-871d-24c1df0749d3",
  "title": "Television Club"
 },
 {
  "id": "6ca2c311-331c-4fe5-b80a-c7f9fdc24e41",
  "title": "Book Club"
 },
 {
  "id": "a0a59fee-1ad3-4270-b24a-ab9ec5763984",
  "title": "Art Club"
 },
 {
  "id": "bd80684a-d7b8-4a28-a19d-8dad9b7852fe",
  "title": "Language Club (Version 1)"
 },
 {
  "id": "528d9505-247d-4418-8223-de8c0dca8b1f",
  "title": "Technology Club (Version 1)"
 },
 {
  "id": "db09f0ed-1e84-43b4-8a9a-a83e4df1801f",
  "title": "Debate Club"
 },
 {
  "id": "8ff37cda-63a4-459b-bd58-6b92ce1216d0",
  "title": "English Club (Version 3)"
 },
 {
  "id": "5410b78d-b50d-4c90-abda-dadf87784bad",
  "title": "Fitness Club (Version 1)"
 },
 {
  "id": "ca714203-33f9-440e-8a0d-2eac3881b86c",
  "title": "Photography Club"
 },
 {
  "id": "c2b6bc31-cb0c-4c4b-b1f8-26b3200688ac",
  "title": "Reading Club"
 },
 {
  "id": "aa1fb12c-264b-418b-b871-b17af51c3e8e",
  "title": "Sports Club"
 },
 {
  "id": "fdc9b23a-9157-4cd5-839c-f70747ca2b89",
  "title": "Food Club"
 },
 {
  "id": "42892090-8475-4b78-87c6-1720e3aabe8c",
  "title": "English Club (Version 1)"
 },
 {
  "id": "a3698ba7-0597-4259-bb8c-9fe7872d3cbb",
  "title": "Outdoor Club"
 },
 {
  "id": "d221f569-6e80-4588-84ac-dddaf10f1d05",
  "title": "English Club (Version 2)"
 },
 {
  "id": "0203909e-39c8-4c68-8483-381d302fa28e",
  "title": "Museum Club"
 },
 {
  "id": "df7c0c6b-ec2e-4d7e-9b6a-11f012b87631",
  "title": "Home Living Club"
 },
 {
  "id": "8e448cec-9541-48c3-8920-b816e32c5ebe",
  "title": "Business Club"
 },
 {
  "id": "ec1bc673-47de-432f-b9f7-2735d6502684",
  "title": "Film Club"
 },
 {
  "id": "f962ba2f-f40f-4921-a2eb-b798b4cb72d3",
  "title": "Travel Club (Version 2)"
 },
 {
  "id": "6c72a61a-451a-47f5-9b78-095857338b51",
  "title": "Cinema Club"
 },
 {
  "id": "8a71dc2b-9dd5-4876-b10a-7d87c9e7e7d2",
  "title": "Science Club"
 },
 {
  "id": "cbbf6981-6467-45f4-9616-0a11766d3a3c",
  "title": "Computer Club"
 },
 {
  "id": "18287e23-3994-47cc-9a35-e6e075e8f3c0",
  "title": "Garden Club"
 },
 {
  "id": "a27c1556-10c3-4579-a6e6-c10be43d1a70",
  "title": "Healthy Club"
 },
 {
  "id": "d76f16da-fa5b-42ad-8994-cc142c0a1e85",
  "title": "English Club (Version 2)"
 },
 {
  "id": "3ee33725-18d2-4e4e-8090-67351b98443b",
  "title": "Writing Club"
 },
 {
  "id": "018a4b28-faf7-4f65-88bd-8a247329989f",
  "title": "Nature Club"
 },
 {
  "id": "ad245b5f-e755-4b2e-bf26-95a3ff0b4450",
  "title": "Language Club (Version 2)"
 },
 {
  "id": "72eb5369-335e-484a-aa0d-04c6f604fb15",
  "title": "Community Club"
 },
 {
  "id": "1e543be2-c234-40eb-9dd4-a1bd700f327f",
  "title": "Home Living"
 },
 {
  "id": "114394df-3f45-49a8-a490-b6dca37ec24c",
  "title": "Walking Club (Version 1)"
 },
 {
  "id": "01dd3490-6b63-4901-8de3-18d99d504fd5",
  "title": "Beautiful Homes Club"
 },
 {
  "id": "55dd934a-f502-475f-9e86-52b1a4fa4e22",
  "title": "Car Club"
 },
 {
  "id": "8736c990-7bb2-4aab-872d-b6cba5f2eb8a",
  "title": "Travel Club"
 },
 {
  "id": "12df5c64-1303-4a79-a7d0-8a84b11e64ef",
  "title": "Movie Club"
 },
 {
  "id": "a44d6977-012d-4863-b28a-eb2da0d70ff4",
  "title": "Music Club"
 },
 {
  "id": "9949d4d8-3de1-41b2-9cee-9e9a604c50b6",
  "title": "College Club"
 },
 {
  "id": "492e371e-8860-4ae7-bab2-176364ce96a5",
  "title": "Nature Club (Version 2)"
 },
 {
  "id": "6b924f6a-b8a0-445f-9c6d-910c28f21f52",
  "title": "Cooking Club"
 },
 {
  "id": "35de7b19-138d-4687-a047-9c0be5925352",
  "title": "Fitness Club (Version 2)"
 },
 {
  "id": "f18d75e1-e0cc-4f7d-a530-ef18fe986b8c",
  "title": "Technology Club (Version 2)"
 },
 {
  "id": "55334e3b-5c2f-4bb4-9a13-c0756b476823",
  "title": "Walking Club (Version 2)"
 },
 {
  "id": "f1c0ff72-6898-40be-ac50-cf523ca2bc7b",
  "title": "Food Club (Version 2)"
 }
];

let n = 0;
PAIRS.forEach(function (entry) {
  const r = target.question_set_documents.updateOne(
    { _id: entry.id }, { $set: { title: entry.title, updatedAt: new Date() } });
  n += r.modifiedCount;
});
print('Da doi tieu de ' + n + '/' + PAIRS.length + ' de Writing Part 4');
