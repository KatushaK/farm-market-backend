const express = require('express');
const app = express();
const mongoose = require('mongoose');
const cors = require('cors');
const bcrypt = require('bcrypt');


require('dotenv').config();
mongoose.set("strictQuery", false)

const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);

const PORT = 8080 || process.env.PORT;

app.use(express.json({ limit: "10mb" }))
app.use(cors());


mongoose
    .connect(process.env.MONGODB_LINK)
    .then(() => console.log('WE WERE CONNECTED TO MONGO'))
    .catch((err) => console.log(err))


const userSchema = new mongoose.Schema({
    firstName: String,
    lastName: String,
    email: {
        type: String,
        unique: true
    },
    password: String, 
    confirmPassword: String
})


const userModel = mongoose.model("user", userSchema)


app.get("/", (req, res) => {
    res.send("Server is running")
})



app.post("/signup", async (req, res) => {
    const { email, password } = req.body;

    try {
        const existingUser = await userModel.findOne({ email: email });

        if (existingUser) {
            res.send({ message: "This email id is already registered", alert: false });
        } else {
            const hashedPassword = await bcrypt.hash(password, 10);
            const data = new userModel({ ...req.body, password: hashedPassword });
            await data.save();
            res.send({ message: "Successfully registered", alert: true });
        }
    } catch (err) {
        console.error(err);
        res.status(500).send({ message: "Internal Server Error" });
    }
});



app.post("/login", async (req, res) => {
    const { email, password } = req.body;

    try {
        const user = await userModel.findOne({ email: email });

        if (user) {
            const isPasswordValid = await bcrypt.compare(password, user.password);

            if (isPasswordValid) {
                const dataSend = {
                    _id: user._id,
                    firstName: user.firstName,
                    lastName: user.lastName,
                    email: user.email
                };
                console.log(dataSend);

                res.send({ message: "Login is successful", alert: true, data: dataSend });
            } else {
                res.send({ message: "Invalid email or password", alert: false });
            }
        } else {
            res.send({ message: "Invalid email or password", alert: false });
        }
    } catch (err) {
        console.error(err);
        res.status(500).send({ message: "Internal Server Error" });
    }
});




const schemaProduct = new mongoose.Schema({
    name: String,
    category: String,
    image: String,
    price: Number,
    description: String
})

const productModel = mongoose.model("product", schemaProduct)

app.post("/uploadProduct", async (req,res) => {
    const data = new productModel({...req.body})
    const dataSave = await data.save()
    console.log(dataSave)
    res.send({message: "Product was saved"})
})

app.get("/product", async (req, res) => {
    const data = await productModel.find({})
    res.send(JSON.stringify(data))
})



app.post("/checkout-payment", async (req, res) => {
    try {
        const params = {
            submit_type: 'pay',
            mode: 'payment',
            payment_method_types: ['card'],
            billing_address_collection: 'auto',
            shipping_options: [{ shipping_rate: 'shr_1OlIRbLZXpyyH6OITSisoNcr' }],
            line_items: req.body.map((item) => ({
                price_data: {
                    currency: 'usd',
                    product_data: {
                        name: item.name
                    },
                    unit_amount: item.price * 100
                },
                adjustable_quantity: {
                    enabled: true,
                    minimum: 1
                },
                quantity: item.quantity
            })),
            success_url: `${process.env.FRONTEND_URL}/success`,
            cancel_url: `${process.env.FRONTEND_URL}/cancel`
        };

        const session = await stripe.checkout.sessions.create(params);
        res.status(200).json(session.id); 
    } catch (error) {
        res.status(error.statusCode || 500).json(error.message); 
    }
});






app.listen(PORT, () => {
    console.log(`I'm listening on port ${PORT}`)
});