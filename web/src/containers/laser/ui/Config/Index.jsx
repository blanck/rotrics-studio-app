import React from 'react';
import {connect} from 'react-redux';
import FileSaver from 'file-saver';
import globalStyles from '../../../../globalStyles.css';
import styles from './styles.css';
import {Button, Input, Space, message} from 'antd';

import "antd/dist/antd.css";

import Transformation from './Transformation.jsx';

import ConfigGreyscale from './ConfigGreyscale.jsx';
import ConfigBW from './ConfigBW.jsx';
import ConfigSvg from './ConfigSvg.jsx';
import ConfigText from './ConfigText.jsx';

import WorkingParameters from './WorkingParameters.jsx';

import Line from '../../../../components/Line/Index.jsx'
import {actions as gcodeSendActions} from "../../../../reducers/gcodeSend";
import {actions as laserActions} from "../../../../reducers/laser";

//Jimp支持的文件格式  https://github.com/oliver-moran/jimp
const getAccept = (fileType) => {
    let accept = '';
    switch (fileType) {
        case "bw":
        case "greyscale":
            //TODO: .tiff读取报错
            // Error: read ECONNRESET
            //       at TCP.onStreamRead (internal/stream_base_commons.js:205:27)
            // accept = '.bmp, .gif, .jpeg, .jpg, .png, .tiff';
            accept = '.bmp, .gif, .jpeg, .jpg, .png';
            break;
        case "svg":
        case "text":
            accept = '.svg';
            break;
    }
    return accept;
};

class Index extends React.Component {
    fileInput = React.createRef();
    state = {
        fileType: '', // bw, greyscale, svg, text
        accept: '',
    };

    actions = {
        onChangeFile: (event) => {
            //bw, greyscale, svg
            const file = event.target.files[0];
            const fileType = this.state.fileType;
            this.props.addModel(fileType, file);
        },
        onClickToUpload: (fileType) => {
            if (fileType === "text") {
                this.props.addModel(fileType);
            } else {
                this.setState({
                    fileType,
                    accept: getAccept(fileType)
                }, () => {
                    this.fileInput.current.value = null;
                    this.fileInput.current.click();
                });
            }
        },
        generateGcode: () => {
            if (this.actions._checkStatus4gcode("generateGcode")) {
                this.props.generateGcode();
                message.success('Generate G-code success', 1);
            }
        },
        exportGcode: () => {
            if (this.actions._checkStatus4gcode("exportGcode")) {
                const date = new Date();
                //https://blog.csdn.net/xu511739113/article/details/72764321
                const arr = [date.getMonth(), date.getDate(), date.getHours(), date.getMinutes(), date.getSeconds()];
                const fileName = arr.join("") + ".gcode";
                const gcode = this.props.gcode;
                const blob = new Blob([gcode], {type: 'text/plain;charset=utf-8'});
                FileSaver.saveAs(blob, fileName, true);
                message.success('Export G-code success', 1);
            }
        },
        startSendGcode: () => {
            if (this.actions._checkStatus4gcode("startSendGcode")) {
                const gcode = this.props.gcode;
                this.props.startSendGcode(gcode);
            }
        },
        stopSendGcode: () => {
            if (this.actions._checkStatus4gcode("stopSendGcode")) {
                this.props.stopSendGcode();
            }
        },
        _checkStatus4gcode: (type) => {
            switch (type) {
                case "generateGcode": {
                    if (this.props.modelCount === 0) {
                        message.warning('Load model first', 1);
                        return false;
                    }
                    if (!this.props.isAllPreviewed) {
                        message.warning('Previewing', 1);
                        return false;
                    }
                    break;
                }
                case "exportGcode": {
                    if (this.props.modelCount === 0) {
                        message.warning('Load model first', 1);
                        return false;
                    }
                    if (!this.props.isAllPreviewed) {
                        message.warning('Previewing', 1);
                        return false;
                    }
                    if (!this.props.gcode) {
                        message.warning('Generate G-code first', 1);
                        return false;
                    }
                    break;
                }
                case "startSendGcode":
                    if (!this.props.gcode) {
                        message.warning('Generate G-code first', 1);
                        return false;
                    }
                    break;
                case "stopSendGcode":
                    if (!this.props.gcode) {
                        message.warning('Generate G-code first', 1);
                        return false;
                    }
                    break;
            }
            return true;
        },
    };

    render() {
        const {accept} = this.state;
        const {model} = this.props;
        const actions = this.actions;
        return (
            <div style={{
                width: "100%",
                height: "100%"
            }}>
                <Space direction={"vertical"} size="small"
                       style={{width: "100%", paddingLeft: "8px", paddingRight: "8px"}}>
                    <Button
                        className={globalStyles.btn_func}
                        block
                        size="small"
                        onClick={actions.generateGcode}
                    >
                        {"Generate G-code"}
                    </Button>
                    <Button
                        className={globalStyles.btn_func}
                        block
                        size="small"
                        onClick={actions.exportGcode}
                    >
                        {"Export G-code"}
                    </Button>
                    <Button
                        className={globalStyles.btn_func}
                        block
                        size="small"
                        onClick={actions.startSendGcode}
                    >
                        {"Start Send"}
                    </Button>
                    <Button
                        className={globalStyles.btn_func}
                        block
                        size="small"
                        onClick={actions.stopSendGcode}
                    >
                        {"Stop Send"}
                    </Button>
                </Space>
                <Line/>
                <h4 style={{
                    padding: "10px 0 0 10px",
                    color: "grey"
                }}> {" selected image type: " + (model ? model.fileType : "")}</h4>
                <input
                    ref={this.fileInput}
                    type="file"
                    accept={accept}
                    style={{display: 'none'}}
                    multiple={false}
                    onChange={actions.onChangeFile}
                />
                <Space direction={"horizontal"} style={{width: "100%", paddingLeft: "10px"}} size={16}>
                    <button
                        className={styles.btn_bw}
                        onClick={() => actions.onClickToUpload('bw')}
                    >
                        <h6 className={styles.h_file_type}>B&W</h6>
                    </button>
                    <button
                        className={styles.btn_greyscale}
                        onClick={() => actions.onClickToUpload('greyscale')}
                    >
                        <h6 className={styles.h_file_type}>GREYSCALE</h6>
                    </button>
                    <button
                        className={styles.btn_svg}
                        onClick={() => actions.onClickToUpload('svg')}
                    >
                        <h6 className={styles.h_file_type}>SVG</h6>
                    </button>
                    <button
                        className={styles.btn_text}
                        onClick={() => actions.onClickToUpload('text')}
                    >
                        <h6 className={styles.h_file_type}>TEXT</h6>
                    </button>
                </Space>
                <Transformation/>
                <ConfigGreyscale/>
                <ConfigBW/>
                <ConfigSvg/>
                <ConfigText/>
                <WorkingParameters/>
            </div>
        )
    }
}

const mapStateToProps = (state) => {
    const {gcode, model, modelCount, isAllPreviewed} = state.laser;
    return {
        gcode,
        model,
        isAllPreviewed,
        modelCount,
    };
};

const mapDispatchToProps = (dispatch) => {
    return {
        startSendGcode: (gcode) => dispatch(gcodeSendActions.start(gcode)),
        stopSendGcode: () => dispatch(gcodeSendActions.stop()),
        //model
        addModel: (fileType, file) => dispatch(laserActions.addModel(fileType, file)),
        generateGcode: () => dispatch(laserActions.generateGcode()),
    };
};

export default connect(mapStateToProps, mapDispatchToProps)(Index);
