import { Hono } from 'hono';
import health from './health';
import student from './student';
import admin from './admin';
import messagesController from '../controllers/messages';
import challengesController from '../controllers/challenges';

const routes = new Hono();

routes.route('/', health);
routes.route('/student', student);
routes.route('/messages', messagesController);
routes.route('/challenges', challengesController);
routes.route('/admin', admin);

export default routes;




