const express = require('express');
const path = require('path');
const usersRouter = require('./routes/users');
const studyLogsRouter = require('./routes/studyLogs');
const videosRouter = require('./routes/videos');
const feedRouter = require('./routes/feed');
const sessionsRouter = require('./routes/sessions');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());
app.use(express.static(path.join(__dirname, '../public')));
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));

app.use('/api/users', usersRouter);
app.use('/api/users/:userId/study-logs', studyLogsRouter);
app.use('/api/users/:userId/videos', videosRouter);
app.use('/api/feed', feedRouter);
app.use('/api/sessions', sessionsRouter);

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
