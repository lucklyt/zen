// src/pages/SceneList.js
import React, { useEffect, useState } from 'react';
import { Table, Button, notification, Modal, Form, Input } from 'antd';
import axios from 'axios';

const SceneList = () => {
    const [scenes, setScenes] = useState([]);
    const [isModalVisible, setIsModalVisible] = useState(false);
    const [form] = Form.useForm();

    useEffect(() => {
        fetchScenes();
    }, []);

    const fetchScenes = async () => {
        try {
            const response = await axios.get('http://localhost:9000/internal/api/v1/strategy/list-scenes?page_index=1&page_size=100');
            setScenes(response.data.data.records);
        } catch (error) {
            notification.error({ message: 'Error fetching scenes', description: error.toString() });
        }
    };

    const handleAddScene = async (values) => {
        try {
            await axios.post('http://localhost:9000/internal/api/v1/strategy/create-scene', values);
            notification.success({ message: 'Scene added successfully' });
            setIsModalVisible(false);
            form.resetFields();
            fetchScenes();
        } catch (error) {
            notification.error({ message: 'Error adding scene', description: error.toString() });
        }
    };

    const columns = [
        {
            title: '业务线',
            dataIndex: 'business',
            key: 'business',
        },
        {
            title: '场景名',
            dataIndex: 'scene',
            key: 'scene',
        },
        {
            title: '场景描述',
            dataIndex: 'desc',
            key: 'desc',
        },
        {
            title: '操作',
            key: 'action',
            render: (_, record) => (
                <Button onClick={() => window.location.href = `/zen?business=${record.business}&scene=${record.scene}`}>查看</Button>
            ),
        },
    ];

    return (
        <div>
            <h1>场景列表</h1>
            <Button type="primary" onClick={() => setIsModalVisible(true)} style={{ marginBottom: 16 }}>
                添加场景
            </Button>
            <Table columns={columns} dataSource={scenes} rowKey="scene" />
            <Modal
                title="添加场景"
                open={isModalVisible}
                onCancel={() => setIsModalVisible(false)}
                onOk={() => form.submit()}
            >
                <Form form={form} onFinish={handleAddScene}>
                    <Form.Item name="business" label="业务线" rules={[{ required: true, message: '请输入业务线' }]}>
                        <Input />
                    </Form.Item>
                    <Form.Item name="scene" label="场景标识" rules={[{ required: true, message: '请输入场景标识' }]}>
                        <Input />
                    </Form.Item>
                    <Form.Item name="desc" label="场景描述" rules={[{ required: true, message: '请输入场景描述' }]}>
                        <Input />
                    </Form.Item>
                </Form>
            </Modal>
        </div>
    );
};

export default SceneList;