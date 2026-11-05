/* Gammon Ledger — Firebase backend for online play.
   Uses the Firebase compat SDK loaded from ./vendor/. The game talks to this
   through a small interface so it never touches Firebase directly:
     start()            -> Promise<uid>          anonymous sign-in
     create(code, data) -> Promise               fails with "taken" if the code exists
     update(code, fn)   -> Promise<result>       transaction; fn(data) returns {data, result}
     watch(code, cb)    -> unsubscribe           live match document
     mine(uid)          -> Promise<[match]>      matches this player sits in
     touch(code, patch) -> Promise               small field update (presence)
     chatSend(code, m)  -> Promise
     chatWatch(code,cb) -> unsubscribe           last 100 messages, oldest first */
(function () {
  "use strict";
  // Firestore rejects `undefined`; a JSON round trip drops it.
  function clean(o) { return JSON.parse(JSON.stringify(o)); }

  window.GammonBackendFactory = function (cfg) {
    var app = firebase.apps.length ? firebase.app() : firebase.initializeApp(cfg);
    var auth = firebase.auth(app);
    var fs = firebase.firestore(app);
    var matches = fs.collection("matches");

    return {
      start: function () {
        return new Promise(function (resolve, reject) {
          var off = auth.onAuthStateChanged(function (user) {
            off();
            if (user) { resolve(user.uid); return; }
            auth.signInAnonymously()
              .then(function (cred) { resolve(cred.user.uid); })
              .catch(reject);
          }, reject);
        });
      },

      create: function (code, data) {
        var ref = matches.doc(code);
        return fs.runTransaction(function (t) {
          return t.get(ref).then(function (snap) {
            if (snap.exists) throw new Error("taken");
            t.set(ref, clean(data));
          });
        });
      },

      update: function (code, fn) {
        var ref = matches.doc(code);
        return fs.runTransaction(function (t) {
          return t.get(ref).then(function (snap) {
            return Promise.resolve(fn(snap.exists ? snap.data() : null)).then(function (out) {
              if (out && out.data) t.set(ref, clean(out.data));
              return out ? out.result : undefined;
            });
          });
        });
      },

      watch: function (code, cb, onError) {
        return matches.doc(code).onSnapshot(
          function (snap) { cb(snap.exists ? snap.data() : null); },
          onError || function () {}
        );
      },

      mine: function (uid) {
        // array-contains alone needs no composite index; sorting happens in the page.
        return matches.where("players", "array-contains", uid).limit(40).get()
          .then(function (q) { return q.docs.map(function (d) { return d.data(); }); });
      },

      touch: function (code, patch) {
        return matches.doc(code).update(clean(patch));
      },

      chatSend: function (code, msg) {
        return matches.doc(code).collection("chat").add(clean(msg));
      },

      chatWatch: function (code, cb) {
        return matches.doc(code).collection("chat").orderBy("ts").limitToLast(100)
          .onSnapshot(function (q) { cb(q.docs.map(function (d) { return d.data(); })); }, function () {});
      }
    };
  };
})();
