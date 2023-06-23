const clientSchema = {
    name: {
        type: String,
        required: true,
        unique: true
    },
    email: String,
    company: String,
    phone: String,
    city: String,
    state: String,
    address: String,
    budget: Number,
    term: String,
    message: String
}

module.exports = clientSchema