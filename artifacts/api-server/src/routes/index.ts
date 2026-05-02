import { Router, type IRouter } from "express";
import healthRouter from "./health";
import authRouter from "./auth";
import profilesRouter from "./profiles";
import coursesRouter from "./courses";
import matchesRouter from "./matches";
import pathwaysRouter from "./pathways";
import guidebooksRouter from "./guidebooks";
import roadmapsRouter from "./roadmaps";
import progressRouter from "./progress";
import internshipsSearchRouter from "./internships-search";
import opportunitiesRouter from "./opportunities";
import dashboardRouter from "./dashboard";
import universitiesRouter from "./universities";

const router: IRouter = Router();

router.use(healthRouter);
router.use(authRouter);
router.use(profilesRouter);
router.use(coursesRouter);
router.use(matchesRouter);
router.use(pathwaysRouter);
router.use(guidebooksRouter);
router.use(roadmapsRouter);
router.use(progressRouter);
router.use(internshipsSearchRouter);
router.use(opportunitiesRouter);
router.use(dashboardRouter);
router.use(universitiesRouter);

export default router;
