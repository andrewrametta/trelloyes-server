require("dotenv").config();
const express = require("express");
const morgan = require("morgan");
const cors = require("cors");
const helmet = require("helmet");
const { NODE_ENV } = require("./config");
const winston = require("winston");
const { v4: uuid } = require("uuid");

const app = express();

const morganOption = NODE_ENV === "production" ? "tiny" : "common";

const logger = winston.createLogger({
  level: "info",
  format: winston.format.json(),
  transports: [new winston.transports.File({ filename: "info.log" })],
});

if (NODE_ENV !== "production") {
  logger.add(
    new winston.transports.Console({
      format: winston.format.simple(),
    })
  );
}

const cards = [
  {
    id: 1,
    title: "Task One",
    content: "This is card one",
  },
];
const lists = [
  {
    id: 1,
    header: "List One",
    cardIds: [1],
  },
];

app.use(morgan(morganOption));
app.use(cors());
app.use(helmet());
app.use(validateBearerToken);
app.use(errorHandler);
app.use(express.json());

app.get("/", (req, res) => {
  res.send("Hello World");
});
app.get("/card", (req, res) => {
  res.json(cards);
});
app.get("/list", (req, res) => {
  res.json(lists);
});
app.get("/card/:id", (req, res) => {
  const { id } = req.params;
  const card = cards.find((c) => c.id == id);
  // make sure we found a card
  if (!card) {
    logger.error(`Card with id ${id} not found.`);
    return res.status(404).send("Card Not Found");
  }
  res.json(card);
});
app.get("/list/:id", (req, res) => {
  const { id } = req.params;
  const list = lists.find((li) => li.id == id);
  // make sure we found a list
  if (!list) {
    logger.error(`List with id ${id} not found.`);
    return res.status(404).send("List Not Found");
  }
  res.json(list);
});

app.post("/card", (req, res) => {
  const { title, content } = req.body;
  if (!title) {
    logger.error("Title is required");
    return res.status(400).send("Invalid data");
  }
  if (!content) {
    logger.error("Content is required");
    return res.status(400).send("Content is required");
  }
  const id = uuid();
  const card = {
    id,
    title,
    content,
  };
  cards.push(card);
  logger.info(`Card with id ${id} created`);
  res.status(201).location(`http://localhost:8000/card/${id}`).json(card);
});

app.post("/list", (req, res) => {
  const { header, cardIds = [] } = req.body;
  if (!header) {
    logger.error(`Header is required`);
    return res.status(400).send("Invalid data");
  }
  // check card IDs
  if (cardIds) {
    let valid = true;
    cardIds.forEach((cid) => {
      const card = cards.find((c) => c.id == cid);
      if (!card) {
        logger.error(`Card with id ${cid} not found in cards array.`);
        valid = false;
      }
    });

    if (!valid) {
      return res.status(400).send("Invalid data");
    }
  }
  // get an id
  const id = uuid();
  const list = {
    id,
    header,
    cardIds,
  };
  lists.push(list);
  logger.info(`List with id ${id} created`);
  res.status(201).location(`http://localhost:8000/list/${id}`).json({ id });
});

function validateBearerToken(req, res, next) {
  const authToken = req.get("Authorization");
  const apiToken = process.env.API_TOKEN;

  if (!authToken || authToken.split(" ")[1] !== apiToken) {
    logger.error(`Unauthorized request to path: ${req.path}`);
    return res.status(401).json({ error: "Unauthorized Request" });
  }
  next();
}
function errorHandler(error, req, res, next) {
  let response;
  if (NODE_ENV === "product") {
    response = { error: { message: "server error" } };
  } else {
    console.log(error);
    response = { message: error.message, error };
  }
  res.status(500).json(response);
}

module.exports = app;
