function Chat (nativeMsg) {

    clog('  Constructing Chat inst...')
    
    this._id = util.genHash();
    this.id  = nativeMsg.chat.id; 
    this.name = nativeMsg.chat.first_name;
    this.$nmsg = nativeMsg; 
    this.$storage = {};
}

module.exports = Chat;