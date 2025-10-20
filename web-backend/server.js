const express = require('express');
const cors = require('cors');
const routineRoutes = require('./routes/routineRoutes');
const taskRoutes = require('./routes/taskRoutes');


const app = express();
app.use(cors());
app.use(express.json());


app.use('/api/routine', routineRoutes);
app.use('/api/tasks', taskRoutes);


const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Mock Backend running on port ${PORT}`));


