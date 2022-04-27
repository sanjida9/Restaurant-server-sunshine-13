const express = require("express");
const cors = require("cors");
const app = express();
require("dotenv").config();

const ObjectId = require("mongodb").ObjectId;
const stripe = require("stripe")(process.env.STRIPE_SECRET);

const { MongoClient } = require("mongodb");

const port = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());

const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.kryx3.mongodb.net/myFirstDatabase?retryWrites=true&w=majority`;
const client = new MongoClient(uri, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
});

async function run() {
  try {
    await client.connect();
    const database = client.db("restaurant");
    const foodsCollection = database.collection("food");
    const orderCollection = database.collection("orders");
    const reviewCollection = database.collection("reviews");
    const userRolesCollection = database.collection("userRoles");

    app.get("/foods", async (req, res) => {
      const selected = req.query.filter;
      if (selected === "less600") {
        const filter = { price: { $lt: 600 } };
        const result = await foodsCollection.find(filter).toArray();
        res.send(result);
      } else if (selected === "low") {
        const filter = { costing: "Low" };
        const result = await foodsCollection.find(filter).toArray();
        res.send(result);
      } else if (selected === "high") {
        const filter = { costing: "High" };
        const result = await foodsCollection.find(filter).toArray();
        res.send(result);
      } else if (selected === "veryhigh") {
        const filter = { costing: "Very High" };
        const result = await foodsCollection.find(filter).toArray();
        res.send(result);
      } else {
        const allFoods = await foodsCollection.find({}).toArray();
        res.send(allFoods);
      }
    });

    app.get("/food/:id", async (req, res) => {
      const foodID = req.params.id;
      const singleFood = await foodsCollection
        .find({
          _id: ObjectId(foodID),
        })
        .toArray();

      res.send(singleFood[0]);
    });

    app.post("/newFood", async (req, res) => {
      const newFoodData = await req.body;
      await foodsCollection.insertOne(newFoodData);

      res.send(newFoodData);
    });

    app.post("/placeOrder", async (req, res) => {
      await orderCollection.insertOne(req.body);
      res.send();
    });

    app.get("/manageAllOrders", async (req, res) => {
      const allUserOrders = await orderCollection.find({}).toArray();

      res.send(allUserOrders);
    });

    app.get("/manageAllOrders/:id", async (req, res) => {
      const id = req.params.id;
      const query = { _id: ObjectId(id) };
      const result = await orderCollection.findOne(query);
      res.json(result);
    });

    app.put("/manageAllOrders/:id", async (req, res) => {
      const id = req.params.id;
      const payment = req.body;
      const filter = { _id: ObjectId(id) };
      const updateDoc = {
        $set: {
          payment: payment,
        },
      };
      const result = await orderCollection.updateOne(filter, updateDoc);
      res.json(result);
    });

    app.post("/deleteOrder", async (req, res) => {
      const userID = await req.body.UserId;
      await orderCollection.deleteOne({ _id: ObjectId(userID) });

      res.json("Deleted!");
    });

    app.post("/singleUserOrders", async (req, res) => {
      const userEmail = await req.body.userEmail;
      const singleUserBooking = await orderCollection
        .find({ userEmail: userEmail })
        .toArray();

      res.json(singleUserBooking);
    });

    app.post("/submitReview", async (req, res) => {
      await reviewCollection.insertOne(req.body);
      res.send();
    });

    app.get("/getReviews", async (req, res) => {
      const reviews = await reviewCollection.find({}).toArray();
      res.send(reviews);
    });

    app.post("/makeAdmin", async (req, res) => {
      const email = req.body.email;

      const filter = { userEmail: email };
      const options = { upsert: true };
      const updateRoles = {
        $set: {
          isAdmin: true,
        },
      };
      await userRolesCollection.updateOne(filter, updateRoles, options);

      res.send();
    });

    app.get("/isAdmin", async (req, res) => {
      const userEmail = req.query.userEmail;
      const result = await userRolesCollection
        .find({ userEmail: userEmail })
        .toArray();

      res.send(result[0]);
    });

    app.get("/getProducts", async (req, res) => {
      const products = await foodsCollection.find({}).toArray();

      res.send(products);
    });

    app.post("/updateStatus", async (req, res) => {
      const status = await req.body.status;
      const id = await req.body.id;

      const filter = { _id: ObjectId(id) };
      await orderCollection.updateOne(filter, { $set: { status: status } });

      res.json("updated");
    });

    // Delete Products
    app.post("/deleteProducts", async (req, res) => {
      const deleteReqId = await req.body.deleteReqId;
      await foodsCollection.deleteOne({ _id: ObjectId(deleteReqId) });

      res.send();
    });

    // app.post("create-payment-intent", async (req, res) => {
    //   const paymentInfo = req.body;
    //   const amount = paymentInfo.price * 100;
    //   const paymentIntent = await stripe.paymentIntents.create({
    //     currency: "usd",
    //     amount: amount,
    //     payment_method_types: ["card"],
    //   });
    //   res.json({ clientSecret: paymentIntent.client_secret });
    // });

    app.post("/create-payment-intent", async (req, res) => {
      const paymentInfo = req.body;
      const amount = paymentInfo.price * 100;
      const paymentIntent = await stripe.paymentIntents.create({
        currency: "usd",
        amount: amount,
        payment_method_types: ["card"],
      });
      res.json({ clientSecret: paymentIntent.client_secret });
    });
  } finally {
    // await client.close();
  }
}

run().catch(console.dir);

console.log(uri);

app.get("/", (req, res) => {
  res.send("Hello FoodPlanet!");
});

app.listen(port, () => {
  console.log(`listening at ${port}`);
});
