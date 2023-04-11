const express = require("express");
const router = express.Router();
const dbConnection = require("./dbConnection");
const validator = require("validator");
const multer = require("multer");
const pdfjsLib = require("pdfjs-dist/legacy/build/pdf.js");
const AWS = require("aws-sdk");
const fs = require("fs");
const cloudfront = new AWS.CloudFront();
const s3 = new AWS.S3();

// const { Configuration, OpenAIApi } = require("openai");
// const configuration = new Configuration({
//   //   apiKey: process.env.OPENAI_API_KEY,
//   apiKey: "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",
// });
// const openai = new OpenAIApi(configuration);
router.post("/upload", async (req, res) => {
  const result = await s3
    .putObject({
      Body: "First Upload",
      Bucket: "max.suit-interivew-portal",
      Key: "my-file.txt",
    })
    .promise();
  return result ? res.status(200).send(result) : null;
});

router.post("/fetchUpload", async (req, res) => {
  const result = await s3
    .getObject({
      Bucket: "max.suit-interivew-portal",
      Key: "my-file.txt",
    })
    .promise();
  return res.status(200).send({ data: result });
});

// Insert Api
router.post("/insert", (req, res) => {
  const {
    fullName,
    username,
    password,
    birthDate,
    sex,
    accountType,
    terms,
    email,
  } = req.body;
  res.header("Access-Control-Allow-Origin", "*");
  // Validate user input
  if (
    !fullName ||
    !username ||
    !password ||
    !birthDate ||
    !sex ||
    !accountType ||
    !terms ||
    !email
  ) {
    return res.status(400).send("Missing required fields");
  }
  if (!validator.isEmail(email)) {
    return res.status(400).send("Invalid email address");
  }
  if (username || email) {
    const searchUserQuery = `SELECT * FROM users WHERE username = ? OR email = ?`;
    dbConnection.query(searchUserQuery, [username, email], (err, result) => {
      if (err) {
        return res.status(500).send("Unable to Connect Database");
      } else {
        if (result.length === 0) {
          const insertUserQuery = `INSERT INTO users (_id, fullName, username, password, birthDate, sex, accountType, terms, email) VALUES (NULL, ?, ?, sha1(?), ?, ?, ?, ?, ?)`;
          const values = [
            fullName,
            username,
            password,
            birthDate,
            sex,
            accountType,
            terms,
            email,
          ];
          dbConnection.query(insertUserQuery, values, (err, result) => {
            if (err) {
              console.error("Error inserting record: ", err);
              return res
                .status(500)
                .send("Error inserting record into database");
            } else {
              console.log("Record inserted successfully!");
              return res
                .status(200)
                .send(
                  "Thank you for Registration. Please Login to use Interview Portal "
                );
            }
          });
        } else {
          if (result[0].username === username) {
            return res.status(400).send("username is already in use");
          } else {
            if (result[0].email === email) {
              return res.status(400).send("email is already in use");
            }
          }
        }
      }
    });
  }
});

// Fetch Api
router.post("/user", (req, res) => {
  const { username, password } = req.body;
  res.header("Access-Control-Allow-Origin", "*");
  const fetchUserQuery = `SELECT * FROM users WHERE (username = ? OR email = ?) AND password = sha1(?)`;
  const values = [username, username, password];
  dbConnection.query(fetchUserQuery, values, (err, result) => {
    if (err) {
      return res.status(500).send("Error Fetching user from Database");
    } else {
      if (result.length === 0) {
        return res.status(400).send("User does not exist");
      } else {
        delete result[0].password;
        result[0].terms = true;
        return res.status(200).send(result[0]);
      }
    }
  });
});

// Upload Resume
const upload = multer({ dest: "uploads/" });
router.post("/resumeUpload", upload.single("resume"), async (req, res) => {
  const filePath = req.file.path;
  const resumeDetails = extractResumeDetails(filePath);
  const resumeJson = saveResumeDetails(resumeDetails);
  //   const values = await resumeJson;
  //   const jsonPure = values.content.replace("\n", "");
  res.json({ success: true, data: resumeJson });
});

async function extractResumeDetails(filePath) {
  //   console.log("FilePath", filePath);
  const pdfData = new Uint8Array(fs.readFileSync(filePath));
  const loadingTask = pdfjsLib.getDocument({ data: pdfData });
  const pdf = await loadingTask.promise;
  const totalNumPages = pdf.numPages;
  let resumeText = "";

  for (let pageNum = 1; pageNum <= totalNumPages; pageNum++) {
    const page = await pdf.getPage(pageNum);
    const pageText = await page.getTextContent();
    resumeText += pageText.items.map((item) => item.str).join(" ");
  }

  return resumeText;
}

async function saveResumeDetails(resumeDetails) {
  const result = await resumeDetails;
  const sections = result.split(/\n\n\r\n\r\n/g);
  const section1s = result.split("  ");
  console.log("section1s", section1s);
  const resumeObj = {
    name: "",
    address: "",
    phone: "",
    email: "",
    linkedin: "",
    summary: "",
    experience: [],
    education: [],
    certifications: [],
    technicalSkills: [],
  };

  sections.forEach((section) => {
    if (
      section.includes("Strong professional") ||
      section.includes("years") ||
      section.includes("fresher")
    ) {
      resumeObj.summary = section;
    } else if (section.includes("EXPERIENCE")) {
      const experienceSection = section.split(/\n/g);
      const experienceObj = {
        title: "",
        company: "",
        location: "",
        startDate: "",
        endDate: "",
        responsibilities: "",
      };
      experienceObj.title = experienceSection[1];
      experienceObj.company = experienceSection[2].split(",")[0].trim();
      experienceObj.location = experienceSection[2].split(",")[1].trim();
      experienceObj.startDate = experienceSection[0].split("to")[0].trim();
      experienceObj.endDate = experienceSection[0].split("to")[1].trim();
      experienceObj.responsibilities = experienceSection.slice(3).join(" ");
      resumeObj.experience.push(experienceObj);
    } else if (section.includes("EDUCATION")) {
      const educationSection = section.split(/\n/g);
      const educationObj = {
        degree: "",
        fieldOfStudy: "",
        institute: "",
        startDate: "",
        endDate: "",
        location: "",
      };
      educationObj.degree = educationSection[1].split(",")[0].trim();
      educationObj.fieldOfStudy = educationSection[1].split(",")[1].trim();
      educationObj.institute = educationSection[2].trim();
      educationObj.startDate = educationSection[3].split("-")[0].trim();
      educationObj.endDate = educationSection[3].split("-")[1].trim();
      educationObj.location = educationSection[4].trim();
      resumeObj.education.push(educationObj);
    }
  });

  console.log(">>>", resumeObj);
  return resumeObj;
  // Save the details in the database
  // Define known field names and their corresponding regular expressions
  //   const completion = await openai.createChatCompletion({
  //     model: "gpt-3.5-turbo",
  //     messages: [
  //       {
  //         role: "user",
  //         content: `Generate a JSON from the following information: ${result}`,
  //       },
  //     ],
  //   });
  //   //   generateResume(result);response.data.choices[0].message
  //   //   console.log("resumeDetails", completion.data.choices[0].message);
  //   return completion.data.choices[0].message;
}

module.exports = router;
