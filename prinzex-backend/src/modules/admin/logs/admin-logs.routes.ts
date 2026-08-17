import { Router } from 'express';
import * as logsController from './admin-logs.controller';

const router = Router();

router.get('/', logsController.getLogs);

export { router as adminLogsRouter };
