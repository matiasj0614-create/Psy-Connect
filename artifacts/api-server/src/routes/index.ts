import { Router, type IRouter } from "express";
import healthRouter from "./health";
import sageRouter from "./sage";
import ttsRouter from "./tts";
import contactsRouter from "./contacts";
import providersRouter from "./providers";

const router: IRouter = Router();

router.use(healthRouter);
router.use(sageRouter);
router.use(ttsRouter);
router.use(contactsRouter);
router.use(providersRouter);

export default router;
