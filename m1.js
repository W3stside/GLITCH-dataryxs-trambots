module.exports = {
  
  init: function (senderID, messageText) {
    this.senderID = senderID;
    this.messageText = messageText;
  },
  
  defaultObj: {},
  stopSearchObj: {},
  moreTimesObj: {},
  test: function (senderID, messageText) {

  // If we receive a text message, check to see if it matches a keyword
  // and send back the template example. Otherwise, just echo the text we received.
    switch (senderID, messageText) {

    ///////////////////////////////////////////////////////
    // Metro Ligne 1 Stops
    ///////////////////////////////////////////////////////    

      case 'la defense':
      case 'defense':
        return this.stopSearchObj = {
          senderID: senderID,
          messageText: messageText,
          region: 'fr-idf',
          line: '%3AOIF%3A100110001%3A1OIF439',
          stop: '%3AOIF%3ASA%3A8738221',
          loopStart: 0,
          loopEnd: 4
        };
        //searchStop(senderID, 'fr-idf', '%3AOIF%3A100110001%3A1OIF439','%3AOIF%3ASA%3A8738221', 0, 4);
        break;
      
      case 'plus':
      case 'more':  
        return this.moreTimesObj = {
          senderID: senderID,
          messageText: messageText
        };
        break;
        
      default:
         return this.defaultObj = {senderID: senderID, messageText: messageText};
    }//switch statement
  }//test
};//module.explorts