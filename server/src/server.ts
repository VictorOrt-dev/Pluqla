// Express server bootstrap
import dotenv from 'dotenv';
dotenv.config();

import app from './app';
import { logger } from './middleware/logger';

const PORT = process.env.PORT || 3004;

app.listen(PORT, () => {
  logger.info(`Server running on port ${PORT}`);
});
