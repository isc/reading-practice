// Shared "confirm before leaving" guard.
//
// On mobile a swipe from the left edge triggers the browser's back navigation,
// which can drop you out of a game mid-party by accident. This intercepts that
// (and tab close / refresh) and asks for confirmation while a game is in progress.
//
// By default a game is considered "in progress" as soon as the player interacts
// with the page (first pointer/key/touch). A game can be more precise by calling
// ExitGuard.setActive(true) when a party starts and ExitGuard.setActive(false)
// when it ends; that overrides the automatic heuristic.
(function () {
    var explicitActive = null;   // null => use the interaction heuristic
    var interacted = false;
    var armed = false;           // is our history barrier currently in place?
    var bypass = false;          // set while we deliberately navigate away

    function shouldConfirm() {
        if (bypass) return false;
        if (explicitActive !== null) return explicitActive;
        return interacted;
    }

    function arm() {
        if (armed) return;
        try {
            history.pushState({ exitGuard: true }, '');
            armed = true;
        } catch (e) {
            // pushState can throw on some restricted origins (e.g. file://); ignore.
        }
    }

    function onFirstInteraction() {
        interacted = true;
        arm();
    }

    ['pointerdown', 'keydown', 'touchstart'].forEach(function (evt) {
        document.addEventListener(evt, onFirstInteraction, { once: true, passive: true });
    });

    window.addEventListener('popstate', function () {
        if (!armed) return;       // the barrier was already consumed / never set
        armed = false;
        if (shouldConfirm()) {
            var leave = window.confirm('Une partie est en cours. Veux-tu vraiment quitter le jeu ?');
            if (leave) {
                bypass = true;    // avoid a second (native) prompt during the unload
                history.back();
            } else {
                arm();            // stay on the page: re-add the barrier
            }
        } else {
            history.back();       // nothing in progress: leave straight away
        }
    });

    window.addEventListener('beforeunload', function (e) {
        if (shouldConfirm()) {
            e.preventDefault();
            e.returnValue = '';
        }
    });

    window.ExitGuard = {
        // active === true  -> guard the page; active === false -> stop guarding
        setActive: function (active) {
            explicitActive = !!active;
            if (active) arm();
        },
        // Fall back to the automatic interaction heuristic.
        reset: function () {
            explicitActive = null;
        }
    };
})();
