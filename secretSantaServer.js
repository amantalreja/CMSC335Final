const express = require('express');
const fs = require('fs');
const ejs = require('ejs');
const path = require('path');
const bodyParser = require("body-parser");

require("dotenv").config({ path: path.resolve(__dirname, 'credentialsDontPost/.env') })

const uri = process.env.MONGO_CONNECTION_STRING;

const databaseAndCollection = {db: process.env.MONGO_DB_NAME, collection: process.env.MONGO_COLLECTION};
const { MongoClient, ServerApiVersion } = require('mongodb');


const portNumber = 5001;
const app = express();

app.set("views", path.resolve(__dirname, "templates"));
app.set("view engine", "ejs");
app.use(bodyParser.urlencoded({ extended: false }));

async function insertUser(user) {
    const client = new MongoClient(uri, { useNewUrlParser: true, useUnifiedTopology: true });
    try {
        await client.connect();
        const db = client.db(databaseAndCollection.db);
        const collection = db.collection(databaseAndCollection.collection);
        await collection.insertOne(user);
        console.log(`User inserted with data: ${JSON.stringify(user)}`);
    } finally {
        await client.close();
    }
}

const url = "https://www.youtube.com/embed/1giQVuoTAFM";
app.get("/", (request, response) => {
    response.render("index", {url});
});

app.get("/insertUser", (request, response) => {
    response.render("insertUser", {});
});

app.post("/processUser", async (request, response) => {
    const { name, email, wishes } = request.body;

    const application = {
        name : name,
        email : email,
        wishes: wishes,
    };
    try {
        await insertUser(application);
        response.render("processUser", {
            name: name,
            email: email,
            wishes: wishes,
        });
    } catch (error) {
        console.error("Error inserting application:", error);
        response.status(500).send(`
            <h1>Error</h1>
            <p>There was an error submitting your application. Please try again later.</p>
            <a href="/apply">Back to Application</a>
        `);
    }
});

app.get("/remove", (request, response) => {
    response.render("remove", {});
});

app.post("/processRemove", async (request, response) => {
    const client = new MongoClient(uri, { useNewUrlParser: true, useUnifiedTopology: true, serverApi: ServerApiVersion.v1 });
    try {
        await client.connect();
        const result = await client.db(databaseAndCollection.db)
        .collection(databaseAndCollection.collection)
        .deleteMany({});
        const vars = {
            count : result.deletedCount,
        }
        response.render("processRemove", vars);
    } catch (e) {
        console.error(e);
    } finally {
        await client.close();
    }
});

app.get("/randSelect", (request, response) => {
    const value= "<h4> Submit to randomize wishlist </h4>"
    response.render("randomSelector", {value});
});
app.post("/randSelect", async (request, response) => {
    const result = await getRandomWishListHelper();
    let value= "<h4> Name : "+result.name+"</h4>";
    value+= "<h4> Wishes : "+result.wishes+"</h4>";
    response.render("randomSelector", {value});
});

app.get("/getWishlist",(request,response)=>{
    const value= "<h4> Submit to load wish List </h4>"
    response.render("wishList",{value})
});
app.post('/getWishList',async (request,response)=>{
    const {name} = request.body;
    result = await getWishListHelper(name);

    const value = "<h3> My wishes: "+ result.wishes + "</h3>";
    response.render("wishList",{value});
});

async function getWishListHelper(input) {
    const client = new MongoClient(uri, { useNewUrlParser: true, useUnifiedTopology: true, serverApi: ServerApiVersion.v1 });
    try {
        await client.connect();
        let filter = {name: input};
        const result = await client.db(databaseAndCollection.db)
        .collection(databaseAndCollection.collection)
        .findOne(filter);
        return result;
    } catch (e) {
        console.error(e);
        return {"wishes": "Such doesn't exist"};
    } finally {
        await client.close();
    }
}
async function getRandomWishListHelper() {
    const client = new MongoClient(uri, { useNewUrlParser: true, useUnifiedTopology: true, serverApi: ServerApiVersion.v1 });
    try {
        await client.connect();
        const collection = client.db(databaseAndCollection.db).collection(databaseAndCollection.collection);

        // Get all documents as an array
        const allDocuments = await collection.find({}).toArray();

        if (allDocuments.length === 0) {
            return { name: "noname", wishes: "No entries found in the collection" };
        }

        // Select one document randomly
        const randomIndex = Math.floor(Math.random() * allDocuments.length);
        const randomDocument = allDocuments[randomIndex];

        return randomDocument;
    } catch (e) {
        console.error(e);
        return { name: "noname", wishes: "An error occurred while fetching the data" };
    } finally {
        await client.close();
    }
}

process.stdin.setEncoding("utf8");
const prompt = "Stop to shutdown the server: ";

app.set("views", path.resolve(__dirname, "templates"));
app.set("view engine", "ejs");
app.use(bodyParser.urlencoded({extended:false}));

app.listen(portNumber);
console.log(`Web Server started and running at http://localhost:${portNumber}`);

process.stdout.write(prompt);
process.stdin.on("readable", function () {
    const dataInput = process.stdin.read();
    if (dataInput !== null) {
        const command = dataInput.trim();
        if (command === "stop") {
            process.stdout.write("Shutting down the server");
            process.exit(0);
        } else {
            process.stdout.write(`Invalid command: ${command}\n`)
        }
    }
});

