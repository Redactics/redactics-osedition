import React from 'react';
import styled from 'styled-components';
import Moment from 'react-moment';

import {
  IconButton as MuiIconButton,
  Badge,
  Popover,
  Box,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  Link,
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
  Button,
  FormControlLabel,
  Checkbox,
} from '@material-ui/core';

import {
  Bell,
} from 'react-feather';

import {
  NotificationRecord,
} from '../types/redactics';

import RedacticsContext from '../contexts/RedacticsContext';

const WS_URL = 'ws://localhost:3010';

const IconButton = styled(MuiIconButton)`
  svg {
    width: 22px;
    height: 22px;
  }
`;

const Indicator = styled(Badge)`
  .MuiBadge-badge {
    background: ${(props) => props.theme.header.indicator.background};
    color: ${(props) => props.theme.palette.common.white};
  }
`;

const ReadRow = styled(TableRow)`
  th, td {
    background-color: rgba(0, 0, 0, 0.025);
  }
`;

interface IProps {
  theme: any;
}

interface IState {
  anchorEl?: any;
  notifications: NotificationRecord[];
  stackTrace: string;
  unreadCount: number;
  errorNotificationCheckbox: boolean;
  showException: boolean;
  showErrorNotification: boolean;
  ws: any;
}

class Notifications extends React.Component<IProps, IState> {
  static contextType = RedacticsContext;

  wsTimeout = 250;

  constructor(props: IProps) {
    super(props);

    this.handleClick = this.handleClick.bind(this);
    this.handleClose = this.handleClose.bind(this);
    this.showException = this.showException.bind(this);
    this.hideDialog = this.hideDialog.bind(this);
    this.ackAll = this.ackAll.bind(this);
    this.toggleErrorNotification = this.toggleErrorNotification.bind(this);
    this.displayNotifications = this.displayNotifications.bind(this);
    this.processFirebaseData = this.processFirebaseData.bind(this);

    this.state = {
      anchorEl: null,
      notifications: [],
      stackTrace: '',
      unreadCount: 0,
      errorNotificationCheckbox: false,
      showException: false,
      showErrorNotification: false,
      ws: null,
    };
  }

  componentDidMount() {
    this.wsConnect();
    this.getNotifs();
  }

  async getNotifs() {
    const response = await fetch(`${this.context.apiUrl}/notification`, {
      method: 'get',
      headers: {
        'Content-Type': 'application/json',
      },
    });
    const notifications = await response.json();
    const findUnreads = notifications.notifications.filter((notif:NotificationRecord) => {
      return (!notif.acked && notif.exception)
    })

    this.setState({
      notifications: notifications.notifications,
      unreadCount: findUnreads.length
    });
  }

  handleClick(event:any) {
    this.setState({
      anchorEl: event.currentTarget,
    });
  }

  handleClose() {
    this.setState({
      anchorEl: null,
    });
  }

  showException(event:any, data:NotificationRecord) {
    event.preventDefault();

    let { unreadCount } = this.state;
    if (unreadCount > 0 && !data.acked) {
      unreadCount -= 1;
    }
    const notifications = this.state.notifications.map((notif:NotificationRecord) => {
      if (notif.uuid === data.uuid) {
        notif.acked = true;
      }
      return notif;
    })
    this.setState({
      showException: true,
      stackTrace: data.stackTrace || '',
      notifications,
      unreadCount,
    });
  }

  async hideDialog() {
    if (this.state.errorNotificationCheckbox) {
      // console.log('MARK ACK');
      try {
        await fetch(`${this.context.apiUrl}/users/ackErrorNotification`, {
          method: 'put',
          headers: {
            'Content-Type': 'application/json',
          },
        });
        this.setState({
          showException: false,
          showErrorNotification: false,
          stackTrace: '',
        });
      } catch (err) {
        // console.log('ERR', err);
      }
    } else {
      this.setState({
        showException: false,
        showErrorNotification: false,
        stackTrace: '',
      });
    }
  }

  async ackAll() {
    try {
      this.setState({
        anchorEl: null,
      });
      fetch(`${this.context.apiUrl}/database/ackAll`, {
        method: 'put',
        headers: {
          'Content-Type': 'application/json',
        },
      });
    } catch (err) {
      // console.log('ERR', err);
    }
  }

  toggleErrorNotification(event:any) {
    this.setState({
      errorNotificationCheckbox: event.target.checked,
    });
  }

  wsConnect() {
    var ws = new WebSocket(WS_URL);
    let that = this; // cache the this
    var connectInterval:any;

    // websocket onopen event listener
    ws.onopen = () => {
      console.log("connected websocket main component");

      this.setState({ ws: ws });

      that.wsTimeout = 250; // reset timer to 250 on open of websocket connection 
      clearTimeout(connectInterval); // clear Interval on on open of websocket connection
    };

    ws.onmessage = (event:any) => {
      let data = JSON.parse(event.data);
      if (data.event === "postJobException") { this.getNotifs(); }
    }

    // websocket onclose event listener
    // ws.onclose = e => {
    //   console.log(
    //       `Socket is closed. Reconnect will be attempted in ${Math.min(
    //           10000 / 1000,
    //           (that.timeout + that.timeout) / 1000
    //       )} second.`,
    //       e.reason
    //   );

    //   that.timeout = that.timeout + that.timeout; //increment retry interval
    //   connectInterval = setTimeout(this.check, Math.min(10000, that.timeout)); //call check function after timeout
    // };

    // // websocket onerror event listener
    // ws.onerror = err => {
    //   console.error(
    //       "Socket encountered error: ",
    //       err.message,
    //       "Closing socket"
    //   );

    //   ws.close();
    // };
  };

  /**
   * utilited by the @function connect to check if the connection is close, if so attempts to reconnect
   */
  // check = () => {
  //   const { ws } = this.state;
  //   if (!ws || ws.readyState == WebSocket.CLOSED) this.connect(); //check if websocket instance is closed, if so call `connect` function.
  // };

  displayNotifications() {
    const popoverContent = (this.state.notifications.length) ? (
      <Box>
        <Button color="primary" onClick={this.ackAll}>
          Mark All As Read
        </Button>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>Message</TableCell>
              <TableCell>Workflow</TableCell>
              <TableCell>Date</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {this.state.notifications.map((n:NotificationRecord) => {
              // TODO: DRY, some sort of conditional wrapper
              const exceptionMsg = (n.exception && n.exception.length > 190) ? n.exception.substring(0,189) + "..." : n.exception;
              const exception = (n.acked) ? exceptionMsg : (<b>{exceptionMsg}</b>);

              if (n.firstHeartbeat) {
                return (
                  <TableRow key={n.uuid}>
                    <TableCell component="th" scope="row">
                      The Redactics Agent <b>v.agentName</b> has successfully reported to Redactics
                    </TableCell>
                    <TableCell>

                    </TableCell>
                    <TableCell>
                      <Moment fromNow>{new Date(n.createdAt)}</Moment>
                    </TableCell>
                  </TableRow>
                );
              } else {
                return (
                  <ReadRow key={n.uuid}>
                    <TableCell component="th" scope="row">
                      <Link
                        href="#"
                        onClick={async (event:any) => {
                          if (n.stackTrace) {
                            this.showException(event, n);
                          }
                          try {
                            await fetch(`${this.context.apiUrl}/notification/${n.uuid}/ackException`, {
                              method: 'put',
                              headers: {
                                'Content-Type': 'application/json',
                              },
                            });
                            this.setState({
                              anchorEl: null,
                            });
                          } catch (err) {
                            // console.log('ERR', err);
                          }
                        }}
                      >
                      {exception}
                      </Link>
                    </TableCell>
                    <TableCell>
                      {n.workflowName || "N/A"}
                    </TableCell>
                    <TableCell>
                      <Moment fromNow>{new Date(n.createdAt)}</Moment>
                    </TableCell>
                  </ReadRow>
                );
              }
            })}
          </TableBody>
        </Table>
      </Box>
    ) : (
      <Box m={4}>
        You have no notifications
      </Box>);

    return popoverContent;
  }

  /* eslint-disable no-restricted-syntax */

  processFirebaseData() {
    // let unreadCount = 0;
    // let exceptionsFound = 0;
    // let displayExceptions = 10; // display this many exceptions
    // const notifications = query(ref(fbDatabase, `notifications/${this.context.companyId}`), orderByChild('timestamp'));
    // onValue(notifications, (snapshot) => {
    //   const data = snapshot.val();
    //   if (!data) { return; }
    //   const formattedData = [];
    //   unreadCount = 0;
    //   exceptionsFound = 0;

    //   // show displayExceptions most recent exceptions
    //   let showErrorNotification = false;
    //   for (const [key, v] of Object.entries(data).reverse()) {
    //     // cast Firebase data to AgentFirebaseRecord type
    //     const val: AgentFirebaseRecord = v as AgentFirebaseRecord;
    //     if (!val.ack && typeof val.ack !== 'undefined' && val.exception) {
    //       unreadCount += 1;
    //     }

    //     //console.log("VAL", val)
    //     if (!val.heartbeat && exceptionsFound < displayExceptions) {
    //       // attach key to data
    //       val.key = key;
    //       exceptionsFound++;
    //       formattedData.push(val);
    //     }

    //     if (!val.ack && val.exception && !this.context.ackErrorNotification) {
    //       // trigger dialog about notification bell
    //       showErrorNotification = true;
    //     }
    //   }

    //   //console.log("UNREAD", unreadCount, formattedData.reverse())
    //   this.setState({
    //     showErrorNotification,
    //     errorNotificationCheckbox: false,
    //     firebaseData: formattedData,
    //     unreadCount,
    //   });
    // });
  }

  render() {
    const open = Boolean(this.state.anchorEl);
    const id = open ? 'simple-popover' : undefined;

    return (
      <React.Fragment>
        <IconButton color="inherit" onClick={this.handleClick}>
          <Indicator badgeContent={this.state.unreadCount}>
            <Bell />
          </Indicator>
        </IconButton>
        <Popover
          id={id}
          open={open}
          anchorEl={this.state.anchorEl}
          onClose={this.handleClose}
          anchorOrigin={{
            vertical: 'bottom',
            horizontal: 'left',
          }}
          transformOrigin={{
            vertical: 'top',
            horizontal: 'right',
          }}
        >
          {this.displayNotifications()}
        </Popover>
        <Dialog
          open={this.state.showException}
          onClose={this.hideDialog}
          maxWidth="lg"
          aria-labelledby="dialog-title"
          aria-describedby="dialog-description"
        >
          <DialogTitle id="dialog-title">Error Stacktrace</DialogTitle>
          <DialogContent>
            <DialogContentText id="dialog-description">
              {
                this.state.stackTrace.split('\n').map((text:string, index:number) => <React.Fragment key={`${text}-${index}`}>
                    {text}
                    <br />
                  </React.Fragment>)
              }
            </DialogContentText>

            <DialogActions>
              <Button color="primary" onClick={this.hideDialog}>
                Close
              </Button>
            </DialogActions>
          </DialogContent>
        </Dialog>
      </React.Fragment>
    );
  }
}

export default Notifications;
