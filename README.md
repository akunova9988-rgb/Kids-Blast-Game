# Kids Blast

A mobile-first space-shooter quiz for grades 1–4. A question appears, four answers float by as asteroids, and the student blasts the right one. Short rounds, lives, streaks, and stars. After the stars, an optional checkup asks how the game felt and gives 8 quick questions on the same topic. Teachers see scores and class totals for each game.

The look is a dusk poster: night indigo, cream paper, and gold, peach, teal, and lilac.

No accounts use real personal data. Nicknames and class words are enough. Nothing here calls a paid API or needs a secret.

## Run it

```bash
npm install
npm run dev
```

Open http://127.0.0.1:5173 and a round starts right away. Tap an asteroid, or press 1, 2, 3, or 4. The same page fits a phone, a tablet, and a computer.

The classroom, with sign-in and class results, is at http://127.0.0.1:5173/class when you run the app yourself.

Accounts, classes, question sets, scores, and checkups are stored locally in `data/pglite`. That folder is created on first launch and filled with the demo class. Delete it if you want a fresh seed. Nothing to configure, and no password file.

When this app is hosted, the same class data is shared in its Postgres database so a teacher and students can play from different devices.

To serve the built app:

```bash
npm run build
npm start
```

## Demo class

Class name: **Room 2 Rockets**. Join code: **STAR2**.

On the sign-in screen, tap **Ms. Nova** (teacher), **Luna**, **Kai**, or **Rio**. Those buttons open the demo class. Rio has not played yet. Luna and Kai already have scores on Easy Addition, so the teacher results are not empty.

A new student or teacher can still create an account and choose their own password. That password is stored only as a hash.

## Teacher flow

1. Sign in as Ms. Nova.
2. The class card shows the join code `STAR2` and the students.
3. Open a question set (Easy Addition, Sight Words, or Simple Science) or make a new one.
4. A set has game questions (prompt, four choices, one correct) and up to 8 checkup questions.
5. Assign the set. Students in the class see it as a game.
6. Open Results for a game. You get who played, best score, stars, how the class liked it, whether it felt too easy / just right / too hard, and how the class did on each checkup question.

Feelings are totaled for the class. They are not listed next to a child's name.

## Student flow

1. Sign in as Luna, Kai, or Rio. A new student can create an account and join with `STAR2`.
2. Pick an assigned game.
3. Blast the right asteroid. Tap, click, or press 1, 2, 3, or 4. Arrow keys move between answers.
4. A wrong blast costs a life and resets the streak. Points do not go down.
5. A round is 5 questions (or fewer if the set is short) and 3 lives.
6. The star screen shows score and streak. From there, the checkup is optional:
   - How did you like the game?
   - Was it easy? Too easy, just right, or too hard.
   - Then 8 quick questions on the topic.
7. Skip is always there. Answers are saved for the teacher.

Sound is off until a student or teacher turns it on. The button is in the top bar.

## Game notes

- Hits score 100, plus 50 more for each step of a streak.
- 3 stars means every blast in the round was right. 2 stars means at least half the answers were hits and hits were not outnumbered by misses. Finishing still earns 1 star.
- Words stay short, type stays large, and a miss says "nice try" rather than "wrong."
