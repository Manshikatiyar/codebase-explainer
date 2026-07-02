import { Router, type IRouter } from "express";
import healthRouter from "./health";
import authRouter from "./auth";
import reposRouter from "./repos";
import filesRouter from "./files";
import aiRouter from "./ai";
import dashboardRouter from "./dashboard";

const router: IRouter = Router();

router.use(healthRouter);
router.use(authRouter);
router.use(reposRouter);
router.use(filesRouter);
router.use(aiRouter);
router.use(dashboardRouter);

export default router;
