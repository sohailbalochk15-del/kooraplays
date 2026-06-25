import { Router, type IRouter } from "express";
import healthRouter from "./health";
import worldcupRouter from "./worldcup";
import predictionsRouter from "./predictions";
import proxyRouter from "./proxy";

const router: IRouter = Router();

router.use(healthRouter);
router.use(worldcupRouter);
router.use(predictionsRouter);
router.use(proxyRouter);

export default router;
