# Kids Blast

A mobile-first space-shooter quiz for grades 1–4. A question appears, four answers float by as asteroids, and the student blasts the right one. Short rounds, lives, streaks, and stars. After the stars, an optional checkup asks how the game felt and gives 8 quick questions on the same topic. Teachers see scores and class totals for each game.

The look is a light pastel sky: soft pink, lavender, mint, peach, and light blue.

The home page is an email cabinet through Supabase. A student picks a subject and level, flies a round, then takes a 10-question test. The older nickname classroom stays at `/class` and still needs no secret.

## Run it

```bash
npm install
npm run dev
```

Open http://127.0.0.1:5173 and the sign-in screen is the first thing you see. After a student signs in, they start a flight from the cabinet. Tap an asteroid, or press 1, 2, 3, or 4. The same page fits a phone, a tablet, and a computer.

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

On the class sign-in screen, tap **Luna**, **Kai**, or **Rio**. Those buttons open the demo class. Rio has not played yet. Luna and Kai already have scores on Easy Addition.

A new student or teacher can still create an account and choose their own password. That password is stored only as a hash. Teacher tools open after that person signs in with the password they chose.

## Teacher flow

1. Create a teacher account and choose your own password.
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

## Email accounts (Supabase)

The home page is the email cabinet. The older nickname classroom stays at `/class`.

1. In Supabase, open the SQL editor and run `supabase/migrations/001_profiles_and_results.sql`.
2. Set `SUPABASE_URL` and `SUPABASE_ANON_KEY` for the app, including in the Vercel project settings for a hosted deploy. Do not put the service role key in the app. The server only returns the URL and the anon key from `GET /api/supabase-config`. On Vercel the site is a static build plus that one function; `npx vite build` is the build command so the local database migration does not run there.
3. A teacher signs up and receives a class code. A student signs up with that code.
4. After the 10-question test, the percent is saved. Students see their own history, best score, and progress by subject. Teachers see their class: each student, scores by subject, the class average, and a table they can sort.

Row level security keeps a student on their own rows. A teacher can read students who joined that class code, and cannot change those rows.

## Game notes

- Hits score 100, plus 50 more for each step of a streak.
- 3 stars means every blast in the round was right. 2 stars means at least half the answers were hits and hits were not outnumbered by misses. Finishing still earns 1 star.
- Words stay short, type stays large, and a miss says "nice try" rather than "wrong."
