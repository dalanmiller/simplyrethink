var async = require('async')
  , r   = require('rethinkdb')
  , Promise = require("bluebird")
  , events = require('events')

exports = module.exports = Storage 

function Storage(options) {
  this._db = options.db
  this._connection = null
  events.EventEmitter.call(this);
}

Storage.prototype.__proto__ = events.EventEmitter.prototype

Storage.prototype.getService = function() {
  var self = this
  return new Promise(function (resolve, reject) {
    r.table('website')
      .run(self._connection, function(err, cursor) {
        if (err) {
          console.log("** Error when fetching service", err)
          reject(err)
          return
        }

        resolve(cursor.toArray())
      })
  })
}

Storage.prototype.report = function(doc) {
  var self = this
  return new Promise(function(resolve, reject) {
    r.table('monitor').insert(doc)
      .run(self._connection, function(err, result) {
      if (err) {
        reject(err)
      } else {
        resolve(result)
      }
    })
  })
}

Storage.prototype.subscribe = function(chatId) {
  r.table('subscriber')
    .insert({id: chatId})
    .run(this._connection)
    .then(function(result) {
      console.log("** Insert subscriber and their chat id")
    })
    .error(function(error) {
      console.log("!! Error inserting ", error)
    })
}

Storage.prototype.init = function() {
  var self = this
  return new Promise(function(resolve, reject) {
    r.connect({db: self._db})
      .then(function (c) {
        console.log("** Successful to connect to RethinkDB")
        self._connection = c
        return self
      })
      .error(function(error) {
        console.log("** Fail to initialize storage ", error)
        reject(error)
      }).then(function(){
        console.log("** Finish initalize storage")
        resolve(self)
      })
  })
}

Storage.prototype.watch = function(first_argument) {
  var self = this
  r.table('monitor').changes()('new_val').merge(function(doc) {
    return {
      website: r.db(self._db).table('website').get(doc('website_id')).default({})
    }
  })
  .run(this._connection, function(err, cursor) {
    if (err) {
      console.log(err)
    }

    if (typeof cursor == 'undefined') {
      return
    }

    cursor.each(function(err, row) {
      if (err) {
        console.log("!! Fail to get alert ", err)
      } else {
        self.emit('alertChange', row)
      }
    })
  })
}

Storage.prototype.getSubscribers = function() {
  var self = this
  return new Promise(function(resolve, reject) {
    r.table('subscriber')
      .run(self._connection)
      .then(function(cursor) {
        cursor.toArray().then(function(subscribers) {
          resolve(subscribers)
        })
      })
      .error(function(err) {
        console.log("!! Error when fetching subscribe ", err)
        reject(err)
      })
  })
}

var createData = function(connection) {
  r.table('website').insert([
    {id: 1, uri: 'http://axcoto.com'},
    {id: 2, uri: 'http://blog.noty.im'}
  ]).run(connection)
}

