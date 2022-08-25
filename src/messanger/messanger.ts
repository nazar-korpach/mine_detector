import { Operator, OperatorChannel } from '@srv/operator';
import {SafeChannel, RTServer, AuthMessage} from '../rts';
import { Session, PendingSession } from "./session";
import { RealSessionsInteractor, SessionsInteractor } from './sessions.interactor';

const randomID = () => Math.floor(Math.random() * 2**31).toString(); 

export class DroneMessanger {
  private RTServer:  RTServer
  private activeSessionsPool: {[id: string]: Session} = {} 
  private pendingSessionsPool: {[id: string]: PendingSession} = {}
  private unauthPool: Set<SafeChannel> = new Set()

  constructor(RTServerPort: number, private operator: Operator) {
    this.setupOperator()

    this.RTServer = new RTServer(RTServerPort);
    this.RTServer.startServer();

    this.RTServer.on('connection', channel => {
      this.unauthPool.add(channel);

      channel.once('auth', (message: AuthMessage) => this.onAuth(channel, message) );
    })
  }

  activeSessions(): PendingSession[] {
    // TODO fix
    return Object.values(this.pendingSessionsPool);
  }

  connectOperator(operatorChannel:  OperatorChannel, sessionID: string) {
    if(!this.pendingSessionsPool[sessionID]) {
      throw new Error('Session with such id does not exist');
    }
    const pendingSession = this.pendingSessionsPool[sessionID];
    delete this.pendingSessionsPool[sessionID];
    this.activeSessionsPool[sessionID] = pendingSession.activate(operatorChannel);
  }

  private setupOperator() {
    this.operator.setInteractor( new RealSessionsInteractor(this) )
  }

  private onAuth(channel: SafeChannel, message: AuthMessage) {
    this.unauthPool.delete(channel);

    const id = randomID();
    this.pendingSessionsPool[id] = new PendingSession(channel, id, message.deviceID);
  }

}