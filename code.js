//import the data from the database
var utils = require('./utils');
var bigVar = require('./db/bigFiveVariables');
var db = require('./db/database');
var shuffle = require('shuffle-array');

//Function to get feedback wth letters
exports.getFeedback = function(userAnswer) {

  var final = [];
  var question = utils.getQuestionByNumber(userAnswer.questionId);

  var answers = question.answers;
  var sizeValues = question.sizeValues;
  var selected = utils.getAnswerById(answers, userAnswer.answerId);

  //Add my answer
  var obj = {
    "avatar": userAnswer.myAvatar,
    "answer": selected.answer,
    "username" : userAnswer.username,
    "order": 1
  };
  final.push(obj);

  //Who are the others supporting me?
  var othersSupportMe;
  var others;

  if(question.isMajority){
    othersSupportMe = sizeValues[0];
    others = sizeValues[1];
  } else {
    othersSupportMe = sizeValues[1];
    others = sizeValues[0];
  }

  //Add their answers as well
  var count = shuffle([2,3,4,5]);
  var letterAvatars = ["a.png", "b.png", "d.png", "e.png"];
  var neutralAvatars = ["neutral.png", "neutral.png", "neutral.png", "neutral.png"];
  var avatars;

  //Decide avatar array
  if (userAnswer.cues == 'letter'){
    avatars = letterAvatars;
  } else {
    avatars = neutralAvatars;
  }

  if (othersSupportMe != 0){
    for(i=0; i < othersSupportMe; i++){
      var obj = {
          "avatar": avatars[count[i] - 2],
          "answer": selected.answer,
          "order": count[i]
        };
      final.push(obj);
    }
  }

  //Add the second best ansers
  var nextAnswer = utils.getUnselectedAnswersOrdered(answers, userAnswer.answerId, question.correctOrder)[0];
  if (others != 0){
    for(i=0; i < others; i++){
      var c = count[count.length - (i+1)] - 2;
      console.log("here" + c);
      var obj = {
          "avatar": avatars[c],
          "answer": nextAnswer.answer,
          "order": count[count.length - (i+1)]
        };
      final.push(obj);
    }
  }

  var response = {
    'question' : question,
    'feedback' : final
  };
  return(response);
  console.log(response);
};


//Function to get updated feedback
exports.getUpdatedFeedback = function (userAnswer, feedback){
  var data = [
  {
    "avatar": "https://ui-avatars.com/api/?name=ry+h&rounded=true&background=EBEDEF&color=000000&bold=true",
    "answer": "United States of America",
    "username": "RH",
    "order": 1,
    "hasChanged": true,
    "newAnswer" : "United States of America"
  },
  {
    "avatar": "b.png",
    "answer": "Canada",
    "order": 3,
    "hasChanged": true,
    "newAnswer": "United States of America"
  },
  {
    "avatar": "d.png",
    "answer": "Canada",
    "order": 4,
    "hasChanged": false,
    "newAnswer": "Canada"
  },
  {
    "avatar": "e.png",
    "answer": "Canada",
    "order": 5,
    "hasChanged": false,
    "newAnswer": "Canada"
  },
  {
    "avatar": "a.png",
    "answer": "Canada",
    "hasChanged": false,
    "order": 2,
    "newAnswer": "Canada"
  }
];
  return (data);
};
// Function to get the relevenat explanation for a user, ofr a given question and answer
// To be implemented
exports.getExplanation = function (userId, qId, answerId){
  return ("This could be a potential explanation coming from a script");
};

exports.shuffleArray = function(array){
  for (var i = array.length - 1; i > 0; i--) {
      var j = Math.floor(Math.random() * (i + 1));
      var temp = array[i];
      array[i] = array[j];
      array[j] = temp;
  }
};

//Function to create the questions and answers
exports.getAllQuestions = function() {
  var questions = utils.questions;
  var response = [];

  for (var i = 0; i < questions.length; i++) {
    var ques = questions[i];

    var q = {};
    q.questionId = ques.questionNumber;
    q.questionText = ques.questionText;
    q.questionImg = ques.img ? ques.img : null;
    q.answers = ques.answers;

    response.push(q);
  }
  return (response);
};

//Function to get question by Id
exports.getQuestionByQId = function(id) {
  var questions = utils.questions;
  for (var i = 0; i < questions.length; i++) {
    if (questions[i].questionNumber == id) {
      return (questions[i]);
    }
  }
};

//Function to process the big five data
exports.processBigFive = function(result) {
  var userId = result.userId;
  delete result["userId"];
  var answers = result;

  //Save all to the database
  db.saveBigFiveRaw(userId, answers);

  var allScores = {};

  for (var i = 0; i < bigVar.length; i++) {
    var trait = bigVar[i].key;
    var indexes = bigVar[i].values;
    var score = 0;

    for (var j = 0; j < indexes.length; j++) {
      if (answers[indexes[j].id]) {
        var answer = parseInt(answers[indexes[j].id]);
        if (indexes[j].isReverse) {
          answer = (5 - answer) + 1;
        }
        score = score + answer;
      }
    }
    allScores[trait] = score;
  }
  db.saveBigFiveResults(userId, allScores);
};

//Function to get all big five questions
exports.getBigFiveQuestions = function() {
  var questions = db.getBigFiveQuestions();
  return (questions);
};

//Function to save user data
exports.saveUserData = function(user) {
  var qOrder = [-1];
  var q = [0,1,2,3,4,5,6,7,8,9,10,11,12,13,14];
  var newQ = shuffle(q);
  for (var i = 0; i < newQ.length ; i++){
    qOrder.push(newQ[i]);
  }
  user.qOrder = qOrder;
  return new Promise(function(resolve, reject) {
    db.saveUser(user).then(function(userId) {
      resolve({"id" : userId, "qOrder" : qOrder});
    });
  });
};

//Function to save the user chat
exports.saveUserChat = function(userId, chats) {
  return new Promise(function(resolve, reject) {
    db.saveRawChat(userId, chats).then(function(status) {
      resolve(status);
    });
  });
};

//Function to save an answer
exports.saveAnswer = function(ans) {

  var answer = {};
  answer.userId = ans.userId;
  answer.questionId = ans.questionId;
  answer.oldAnswerId = ans.answerId;
  answer.oldConfidence = ans.confidence;
  answer.newAnswerId = ans.answerId;
  answer.newConfidence = ans.confidence;

  return new Promise(function(resolve, reject) {
    db.saveAnswer(answer).then(function(answerId) {
      resolve(answerId);
    });
  });
};

//Function to update an answer
exports.updateAnswer = function(answer) {
  return new Promise(function(resolve, reject) {
    db.updateAnswer(answer).then(function(answerId) {
      resolve(answerId);
    });
  });
};
