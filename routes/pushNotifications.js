const express = require('express');
const loggedInUsers = require('../models/loggedInUsers');

const app = express();

app.post('/notifications/subscribe', async (req, res) => {
  const {subscription, name} = req.body

  loggedInUsers.findOne({name}, (err, doc) => {
    if(doc) {
      doc.subscription = JSON.stringify(subscription);
      doc.save();
    }
    else {
      const subs = new loggedInUsers({name, subscription: JSON.stringify(subscription)})
      subs.save();
    }
  })
  
  res.status(200).json({'success': true})
});

app.post("/notifications/unsubscribe", (req, res) => {
  const {name} = req.body;

  loggedInUsers.deleteOne({name}, (err) => {
    if(err) {
      res.status(500).json({error: err})
    }
  })
  res.sendStatus(200)
})

app.listen(9000, () => console.log('The server has been started on the port 9000'))

module.exports = app;