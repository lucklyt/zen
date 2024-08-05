import * as React from 'react'
import {useEffect, useState} from 'react';
import { DecisionGraph, JdmConfigProvider,createJdmNode } from '@gorules/jdm-editor';
import '@gorules/jdm-editor/dist/style.css';
import axios from 'axios';
import { Button, Input, Switch, notification,Table,Tooltip,Tag } from 'antd';
import {diff} from 'deep-object-diff';
import { useLocation } from 'react-router-dom';
import { format } from 'date-fns';

// Assuming CustomNodeSpecification is a function that takes an object defining the custom node
const addNameListNode =createJdmNode({
    kind: 'add_namelist',
    group: '名单操作',
    displayName: '添加名单数据',
    shortDescription: '添加数据到指定名单',
    inputs: [
        {
            control: 'text',
            name: 'list_name',
            label: '名单标识',
        },
        {
            control: 'text',
            name: 'dimension',
            label: '维度',
        },
        {
            control: 'text',
            name: 'value',
            label: '值',
        },
        {
            control: 'text',
            name: 'expires_at',
            label: '过期时间(0为永久)',
        },
    ],
})

const delNameListNode =createJdmNode({
    kind: 'del_namelist',
    group: '名单操作',
    displayName: '删除名单数据',
    shortDescription: '删除数据到指定名单',
    inputs: [
        {
            control: 'text',
            name: 'list_name',
            label: '名单标识',
        },
        {
            control: 'text',
            name: 'dimension',
            label: '维度',
        },
        {
            control: 'text',
            name: 'value',
            label: '值',
        },
    ],
})
const incrCounterNode =createJdmNode({
    kind: 'incr_counter',
    group: '计数器',
    displayName: '增加计数',
    shortDescription: '',
    inputs: [
        {
            control: 'text',
            name: 'topic',
            label: '指标',
        },
        {
            control: 'text',
            name: 'subject',
            label: '主体',
        },
        {
            control: 'text',
            name: 'object',
            label: '客体',
        },
        {
            control: 'text',
            name: 'ttl',
            label: '有效期[eg: 15s, 3m, 1h]',
        },
    ],
})

const getCounterNode =createJdmNode({
    kind: 'get_counter',
    group: '计数器',
    displayName: '获取计数',
    shortDescription: '',
    inputs: [
        {
            control: 'text',
            name: 'topic',
            label: '指标',
        },
        {
            control: 'text',
            name: 'subject',
            label: '主体',
        },
        {
            control: 'text',
            name: 'object',
            label: '客体',
        },
        {
            control: 'text',
            name: 'period',
            label: '时间段[eg: 15s, 3m, 1h]',
        },
    ],
})

function ZenPage()  {
    const location = useLocation();
    const queryParams = new URLSearchParams(location.search);
    const business = queryParams.get('business');
    const scene = queryParams.get('scene');

    const [graph, setGraph] = useState({});
    const [tests, setTests] = useState([]);
    const [version, setVersion] = useState('');
    const fetchRule = async () => {
        try {
            const effective_rule = await axios.get('http://localhost:9000/internal/api/v1/strategy/current-rule',{
                params:{
                    business: business,
                    scene: scene,
                }
            });
            setGraph(effective_rule.data.data.content);
            const formattedTests = effective_rule.data.data.test_cases.map(test => ({
                request: JSON.stringify(test.request, null, 2),
                expected: JSON.stringify(test.expected, null, 2),
                enabled: test.enabled ?? false, // Assuming 'enabled' might not be present in all tests
            }));
            setTests(formattedTests);
            setVersion(effective_rule.data.data.version);
        } catch (error) {
            notification.error({ message: 'Error fetching data', description: error.toString() });
        }
    };
    useEffect(() => {
        fetchRule().then(r => console.log(r));
    }, []);
    const [publishHistory, setPublishHistory] = useState([]);
    useEffect(() => {
        const fetchPublishHistory = async () => {
            try {
                const response = await axios.get('http://localhost:9000/internal/api/v1/strategy/list-rule-history',{
                    params:{
                        business: business,
                        scene: scene,
                    }
                });
                setPublishHistory(response.data.data.records);
            } catch (error) {
                notification.error({ message: '获取发布历史失败', description: error.toString() });
            }
        };

        fetchPublishHistory();
    }, []);
    const addTest = () => {
        setTests([...tests, {desc: '', request: '{}', expected: '{}', enabled: true }]);
        console.log(tests)
    };

    const deleteTest = (index) => {
        const newTests = [...tests];
        newTests.splice(index, 1);
        setTests(newTests);
    };

    const toggleDisable = (index) => {
        const newTests = [...tests];
        newTests[index].enabled = !newTests[index].enabled;
        setTests(newTests);
    };

    const updateTest = (index, field, value) => {
        const newTests = [...tests];
        newTests[index][field] = value;
        setTests(newTests);
    };

    const executeTest = async (index) => {
        const test = tests[index];
        const requestBody = {
            input: JSON.parse(test.request),
            rule: graph,
            dry_run: true,
        };
        try {
            const response = await axios.post('http://localhost:9000/internal/api/v1/strategy/evaluate-rule', requestBody);
            const result = response.data.data;
            console.log(result);
            const expected =JSON.parse(test.expected)
            console.log(expected)

            let dt = diff(expected, result)

            if (Object.keys(dt).length === 0 ) {
                notification.success({ message: '测试通过' });
            } else {
                notification.error({ message: '测试失败', description: JSON.stringify(dt, null, 2)});
            }
        } catch (error) {
            notification.error({ message: '测试执行错误', description: error.toString() });
        }
    };

    const publishData = async () => {
        const url = 'http://localhost:9000/internal/api/v1/strategy/release-rule'; // Replace with your actual endpoint URL
        const parsedTests = tests.map(test => ({
            ...test,
            request: JSON.parse(test.request),
            expected: JSON.parse(test.expected),
        }));
        const payload = {
            "business": business,
            "scene": scene,
            "rule": graph,
            "test_cases": parsedTests,
        };

        try {
            const response = await axios.post(url, payload);
            if (response.data.is_succ){
                notification.success({ message: 'Publish Success' });
                window.location.reload();
            }else{
               throw new Error(response.data.data.error_description);
            }
        } catch (error) {
            console.error('Publish Error:', error);
            notification.error({ message: 'Publish Error', description: error.toString() });
        }
    };
    const rollback = async (recordVersion) => {
        try {
            const rsp = await axios.post('http://localhost:9000/internal/api/v1/strategy/rollback-rule',
                { business: business,scene: scene,  version: recordVersion });
            if (rsp.data.is_succ) {
                notification.success({message: 'Rollback successful'});
                window.location.reload();
            }else{
                throw new Error(rsp.data.data.error_description);
            }
        } catch (error) {
            notification.error({ message: 'Rollback failed', description: error.toString() });
        }
    };
    const columns = [
        {
            title: '规则',
            dataIndex: 'rules',
            key: 'rules',
            render: text => (
                <Tooltip title={JSON.stringify(text, null, 2)}>
                    <div className="ruleContentShort">{JSON.stringify(text, null, 2)}</div>
                </Tooltip>
            )
        },
        {
            title: '测试用例',
            dataIndex: 'test_cases',
            key: 'test_cases',
            render: text => (
                <Tooltip title={JSON.stringify(text, null, 2)}>
                    <div className="ruleContentShort">{JSON.stringify(text, null, 2)}</div>
                </Tooltip>
            )
        },
        {
            title: '版本',
            dataIndex: 'version',
            key: 'version',
        },
        {
            title: '发布时间',
            dataIndex: 'created_at',
            key: 'created_at',
            render: text => format(new Date(text * 1000), 'yyyy-MM-dd HH:mm:ss')
        },
        {
            title: '操作',
            key: 'action',
            render: (_, record) => (
                <div>
                    {version === record.version ? (
                        <Tag color="green">生效中</Tag>
                    ) : (
                        <Button onClick={() => rollback(record.version)}>回滚</Button>
                    )}
                    <Button onClick={() => handleViewHistory(record)}>查看</Button>
                </div>
            ),
        },
    ];

    const handleViewHistory = (history) => {
        setGraph(history.rules);
        const formattedTests = history.test_cases.map(test => ({
            enabled: test.enabled,
            request: JSON.stringify(test.request, null, 2),
            expected: JSON.stringify(test.expected, null, 2),
        }));
        setTests(formattedTests);
    };

    // Define the columns for the Table
    const testColumns = [
        {
            title: '用例描述',
            dataIndex: 'description',
            key: 'desc',
            render: (text, record, index) => (
                <Input
                    value={text}
                    onChange={(e) => updateTest(index, 'desc', e.target.value)}
                    placeholder="用例描述"
                />
            ),
        },
        {
            title: '预期请求JSON',
            dataIndex: 'request',
            key: 'request',
            render: (text, record, index) => (
                <Input.TextArea
                    value={text}
                    onChange={(e) => updateTest(index, 'request', e.target.value)}
                    placeholder="预期请求JSON"
                />
            ),
        },
        {
            title: '预期输出JSON',
            dataIndex: 'expected',
            key: 'expected',
            render: (text, record, index) => (
                <Input.TextArea
                    value={text}
                    onChange={(e) => updateTest(index, 'expected', e.target.value)}
                    placeholder="预期输出JSON"
                />
            ),
        },
        {
            title: '启用',
            dataIndex: 'enabled',
            key: 'enabled',
            render: (enabled, record, index) => (
                <Switch checked={enabled} onChange={() => toggleDisable(index)} />
            ),
        },
        {
            title: '操作',
            key: 'action',
            render: (_, record, index) => (
                <div>
                    <Button onClick={() => executeTest(index)}>执行</Button>
                    <Button onClick={() => deleteTest(index)}>删除</Button>
                </div>
            ),
        },
    ];


    return  (
        <>
            <div style={{paddingBottom: '100px'}}>
                <h1>Auth:异常注册</h1>
                <h2> 规则编辑 </h2>
                <JdmConfigProvider>
                    <DecisionGraph value={graph} onChange={setGraph} customNodes={[addNameListNode,delNameListNode,
                    incrCounterNode,getCounterNode]}/>
                </JdmConfigProvider>
                <div style={{marginTop: '20px'}}>
                    <Button onClick={publishData}>发布</Button>
                </div>
                <div style={{marginTop: '20px'}}>
                        <h3>测试用例</h3>
                        <Button onClick={addTest} style={{marginBottom: 16}}>
                            添加测试
                        </Button>
                        <Table
                            columns={testColumns}
                            dataSource={tests.map((test, index) => ({...test, key: index}))}
                            pagination={false}
                        />
                </div>
                <h2 style={{marginTop: '20px'}}>发布历史</h2>
                <div>
                    <Table columns={columns} dataSource={publishHistory} rowKey="version"/>
                </div>
            </div>
        </>
    )
}
export default ZenPage