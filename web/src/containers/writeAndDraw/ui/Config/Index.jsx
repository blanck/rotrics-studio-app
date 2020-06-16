import React from 'react';
import {connect} from 'react-redux';
import _ from 'lodash';
import FileSaver from 'file-saver';

import styles from './styles.css';
import {Button, Space, message, List} from 'antd';

import "antd/dist/antd.css";

import Transformation from './Transformation.jsx';

import ConfigGreyscale from './ConfigGreyscale.jsx';
import ConfigBW from './ConfigBW.jsx';
import ConfigSvg from './ConfigSvg.jsx';
import ConfigText from './ConfigText.jsx';

import WorkingParameters from './WorkingParameters.jsx';

import Model2D from "../../lib/Model2D";
import {uploadImage, generateSvg} from '../../../../api/index.js';
import config_text from "../../lib/settings/config_text.json";
import Line from '../../../../components/Line/Index.jsx'
import {actions as gcodeSendActions} from "../../../../reducers/gcodeSend";
import {actions as writeAndDrawActions} from "../../../../reducers/writeAndDraw";
import {getBuildInSvgArray, base64ToBlob} from "../../buildInSvg";
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
    buildInSvgList = React.createRef();
    state = {
        fileType: '', // bw, greyscale, vector
        accept: '',
    };

    actions = {
        onChooseBuildInSvg: async (event) => {
            this.buildInSvgList.current.style.display = "none";//关闭点选 buildinSvg List
            const response = await uploadImage(base64ToBlob(event.target.src.toString()));
            const {url, width, height} = response;
            const model = new Model2D('svg');
            model.loadImg(url, width, height);
            this.props.addModel(model);
        },


        onChangeFile: async (event) => {
            //bw, greyscale, svg
            const file = event.target.files[0];
            const fileType = this.state.fileType;
            const response = await uploadImage(file);
            const {url, width, height} = response;
            console.log("response: " + JSON.stringify(response))

            const model = new Model2D(fileType);
            model.loadImg(url, width, height);

            this.props.addModel(model);
        },
        onClickToUpload: async (fileType) => {
            this.buildInSvgList.current.style.display = "none";//关闭点选 buildinSvg List
            if (fileType === "text") {
                const config = _.cloneDeep(config_text);
                const svg = await generateSvg(config.config_text);

                const filename = "text.svg";
                const blob = new Blob([svg], {type: 'text/plain'});
                const file = new File([blob], filename);

                const response = await uploadImage(file);

                const {url, width, height} = response;
                console.log("response: " + JSON.stringify(response))

                const model = new Model2D(fileType);
                model.loadImg(url, width, height);

                //增加数据config_text
                model.userData = {config_text: config.config_text};
                this.props.addModel(model);
                return;
            }

            this.setState({
                fileType,
                accept: getAccept(fileType)
            }, () => {
                this.fileInput.current.value = null;
                this.fileInput.current.click();
            });
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
            }
        },
        startSendGcode: () => {
            //todo：serialport状态
            const gcode = this.props.gcode;
            this.props.startSendGcode(gcode);
        },
        stopSendGcode: () => {
            //todo：serialport状态
            this.props.stopSendGcode();
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
                    if (this.props.gcode.length === 0) {
                        message.warning('Generate G-code first', 1);
                        return false;
                    }
                    break;
                }
                case "startSendGcode":
                    break;
                case "stopSendGcode":
                    break;
            }
            return true;
        },
    };


    render() {
        const {accept} = this.state;
        const {fileTypeSelected} = this.props;
        const actions = this.actions;
        return (
            <div style={{
                width: "100%",
                height: "100%"
            }}>
                <Space direction={"vertical"} style={{width: "100%", paddingLeft: "5px", paddingRight: "5px"}}>
                    <Button
                        block
                        onClick={actions.generateGcode}
                    >
                        {"Generate G-code"}
                    </Button>
                    <Button
                        block
                        onClick={actions.exportGcode}
                    >
                        {"Export G-code"}
                    </Button>
                    <Button
                        block
                        onClick={actions.startSendGcode}
                    >
                        {"Start Send"}
                    </Button>
                    <Button
                        block
                        onClick={actions.stopSendGcode}
                    >
                        {"Stop Send"}
                    </Button>
                </Space>
                <Line/>
                <h4 style={{paddingLeft: "10px", color: "grey"}}> {" selected image type: " + fileTypeSelected}</h4>
                <input
                    ref={this.fileInput}
                    type="file"
                    accept={accept}
                    style={{display: 'none'}}
                    multiple={false}
                    onChange={actions.onChangeFile}
                />

                <Space direction={"horizontal"} style={{width: "100%", paddingLeft: "7px"}} size={7}>
                    {/*<button*/}
                    {/*    className={styles.btn_bw}*/}
                    {/*    onClick={() => actions.onClickToUpload('bw')}*/}
                    {/*>*/}
                    {/*    <h6 className={styles.h_file_type}>B&W</h6>*/}
                    {/*</button>*/}
                    {/*<button*/}
                    {/*    className={styles.btn_greyscale}*/}
                    {/*    onClick={() => actions.onClickToUpload('greyscale')}*/}
                    {/*>*/}
                    {/*    <h6 className={styles.h_file_type}>GREYSCALE</h6>*/}
                    {/*</button>*/}
                    <button
                        className={styles.btn_select}
                        onClick={() => {
                            this.buildInSvgList.current.style.display = 'block'
                        }}
                    >
                        <h6 className={styles.h_file_type}>SELECT</h6>
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
                <div
                    ref={this.buildInSvgList}
                    style={{width: "100%", padding: "5px 5px 5px 20px", display: "none"}}>
                    <List
                        grid={{gutter: 4, column: 4}}
                        dataSource={getBuildInSvgArray()}
                        renderItem={(item, index) => (
                            <List.Item>
                                <img className={styles.img_list_item} src={item} onClick={actions.onChooseBuildInSvg}/>
                            </List.Item>
                        )}
                    />
                </div>
                <Transformation/>
                {/*<ConfigGreyscale/>*/}
                {/*<ConfigBW/>*/}
                <ConfigSvg/>
                <ConfigText/>
                <WorkingParameters/>
                <div style={{height: "15px"}}/>
            </div>
        )
    }
}

const mapStateToProps = (state) => {
    // console.log("WriteAndDrawConfigIndexMapStateToProps\n"+JSON.stringify(state,null,2));
    const {status} = state.serialPort;
    const {gcode, model, modelCount, isAllPreviewed} = state.writeAndDraw;
    let fileTypeSelected = model ? model.fileType : "";
    return {
        serialPortStatus: status,
        gcode,
        fileTypeSelected,
        isAllPreviewed,
        modelCount
    };
};

const mapDispatchToProps = (dispatch) => {
    return {
        startSendGcode: (gcode) => dispatch(gcodeSendActions.start(gcode)),
        stopSendGcode: () => dispatch(gcodeSendActions.stop()),
        //model
        addModel: (model) => dispatch(writeAndDrawActions.addModel(model)),
        generateGcode: () => dispatch(writeAndDrawActions.generateGcode()),
    };
};

export default connect(mapStateToProps, mapDispatchToProps)(Index);
