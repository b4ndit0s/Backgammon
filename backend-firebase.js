/* Gammon Ledger — Firebase backend for online play.
   Uses the Firebase compat SDK loaded from ./vendor/. The game talks to this
   through a small interface so it never touches Firebase directly:
     start()                 -> Promise<account|null>  who is signed in, if anyone
     signUp(email, pw, name) -> Promise<account>       new account; an existing
                                                        anonymous player is upgraded
                                                        in place, keeping their games
     signIn(email, pw)       -> Promise<account>
     signOut()               -> Promise
     resetPassword(email)    -> Promise                 emails a reset link
     setName(name)           -> Promise
     keyGet(id)              -> Promise<seed|null>      this account's private dice key
     keyPut(id, seed)        -> Promise<seed>           stores it once; returns the stored one
     create(code, data)      -> Promise                 fails with "taken" if the code exists
     update(code, fn)        -> Promise<result>         transaction; fn(data) returns {data, result}
     watch(code, cb, onErr)  -> unsubscribe             live match document
     mine(uid)               -> Promise<[match]>        matches this player sits in
     openGames()             -> Promise<[match]>        listed matches with an empty seat
     touch(code, patch)      -> Promise                 small field update (presence)
     chatSend(code, m)       -> Promise
     chatDelete(code, id)    -> Promise                 removes a vanishing message
     chatWatch(code, cb)     -> unsubscribe             last 60 messages, oldest first, with ids
   An account is {uid, anon, email, name}. */
(function () {
  "use strict";
  // Firestore rejects `undefined`; a JSON round trip drops it.
  function clean(o) { return JSON.parse(JSON.stringify(o)); }
  function info(u) {
    return u ? { uid: u.uid, anon: !!u.isAnonymous, email: u.email || "", name: u.displayName || "" } : null;
  }

  window.GammonBackendFactory = function (cfg) {
    var app = firebase.apps.length ? firebase.app() : firebase.initializeApp(cfg);
    var auth = firebase.auth(app);
    var fs = firebase.firestore(app);
    var matches = fs.collection("matches");
    function keyRef(id) {
      return fs.collection("keys").doc(auth.currentUser.uid).collection("seeds").doc(id);
    }

    return {
      start: function () {
        return new Promise(function (resolve, reject) {
          var off = auth.onAuthStateChanged(function (u) { off(); resolve(info(u)); }, reject);
        });
      },

      signUp: function (email, pw, name) {
        var cur = auth.currentUser, made;
        if (cur && cur.isAnonymous) {
          // Same user id, so games already started in this browser come along.
          made = cur.linkWithCredential(firebase.auth.EmailAuthProvider.credential(email, pw))
            .then(function (c) { return c.user; });
        } else {
          made = auth.createUserWithEmailAndPassword(email, pw).then(function (c) { return c.user; });
        }
        return made.then(function (u) {
          return u.updateProfile({ displayName: name }).then(function () { return info(auth.currentUser); });
        });
      },

      signIn: function (email, pw) {
        return auth.signInWithEmailAndPassword(email, pw).then(function (c) { return info(c.user); });
      },

      signOut: function () { return auth.signOut(); },

      resetPassword: function (email) { return auth.sendPasswordResetEmail(email); },

      setName: function (name) {
        var u = auth.currentUser;
        return u ? u.updateProfile({ displayName: name }) : Promise.resolve();
      },

      keyGet: function (id) {
        return keyRef(id).get().then(function (s) { return s.exists ? s.data().seed : null; });
      },

      keyPut: function (id, seed) {
        var ref = keyRef(id);
        // Keys are write-once: if one is already stored, that's the one in use.
        return ref.get().then(function (s) {
          if (s.exists) return s.data().seed;
          return ref.set({ seed: seed, ts: Date.now() }).then(function () { return seed; });
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

      openGames: function () {
        // These two filters are what the security rules allow anyone to list.
        return matches.where("guest", "==", null).where("listed", "==", true).limit(40).get()
          .then(function (q) { return q.docs.map(function (d) { return d.data(); }); });
      },

      touch: function (code, patch) {
        return matches.doc(code).update(clean(patch));
      },

      chatSend: function (code, msg) {
        return matches.doc(code).collection("chat").add(clean(msg));
      },

      chatDelete: function (code, id) {
        return matches.doc(code).collection("chat").doc(id).delete();
      },

      chatWatch: function (code, cb) {
        // 60 rather than 100: photos make messages larger.
        return matches.doc(code).collection("chat").orderBy("ts").limitToLast(60)
          .onSnapshot(function (q) {
            cb(q.docs.map(function (d) { var m = d.data(); m.id = d.id; return m; }));
          }, function () {});
      }
    };
  };
})();
