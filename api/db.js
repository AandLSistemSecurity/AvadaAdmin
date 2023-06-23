
class MongoDB {
    constructor(url, mongoose){
        this.url = url;
        this.mongoose = mongoose
    }

    async connect(){
        await this.mongoose.connect(this.url, {
            useNewUrlParser: true,
            useUnifiedTopology: true
        }).then(() => {
            console.log('MongoDB connected')
        }).catch((err) => {
            console.log(err)
        })
    }

    async disconnect(){
        await this.mongoose.disconnect().then(() => {
            console.log('MongoDB disconnected')
        })
    }
}



module.exports = MongoDB