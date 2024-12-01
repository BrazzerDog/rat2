const express = require('express');
const http = require('http');
const WebSocket = require('ws');
const multer = require('multer');
const upload = multer({ dest: 'uploads/' }); // Папка для сохранения загруженных файлов
const readline = require('readline'); // Для чтения ввода из терминала

const app = express();
const port = 47696;

app.use(express.json());

let commands = {};
let clients = {};

// Создаем HTTP-сервер
const server = http.createServer(app);

// Создаем WebSocket-сервер
const wss = new WebSocket.Server({ server });

wss.on('connection', (ws) => {
    console.log('Клиент подключен');

    ws.on('message', (message) => {
        const { serial_number } = JSON.parse(message);
        clients[serial_number] = ws; // Сохраняем соединение клиента по серийному номеру
        console.log(`Клиент с серийным номером ${serial_number} подключен`);
    });

    ws.on('close', () => {
        console.log('Клиент отключен');
    });
});

// Регистрация серийного номера
app.post('/register-serial', (req, res) => {
    const { serial_number } = req.body;

    if (serial_number) {
        commands[serial_number] = 'NO_COMMAND'; // Инициализируем команду как "NO_COMMAND"
        console.log(`[${new Date().toISOString()}] Серийный номер зарегистрирован: ${serial_number}`);

        res.status(200).json({
            status: 'success',
            message: `Серийный номер ${serial_number} успешно зарегистрирован`
        });
    } else {
        console.log(`[${new Date().toISOString()}] Неверный запрос, отсутствует serial_number`);
        res.status(400).json({
            status: 'error',
            message: 'Неверный запрос, отсутствует serial_number'
        });
    }
});

// Загрузка аудиофайла
app.post('/upload-audio/:serial_number', upload.single('audio'), (req, res) => {
    const serialNumber = req.params.serial_number;

    if (req.file) {
        console.log(`[${new Date().toISOString()}] Получен аудиофайл от устройства с серийным номером ${serialNumber}: ${req.file.filename}`);

        res.status(200).json({
            status: 'success',
            message: 'Аудиофайл успешно загружен'
        });
    } else {
        console.log(`[${new Date().toISOString()}] Не удалось загрузить аудиофайл от устройства с серийным номером ${serialNumber}`);

        res.status(400).json({
            status: 'error',
            message: 'Не удалось загрузить аудиофайл'
        });
    }
});

// Запуск сервера
server.listen(port, () => {
    console.log(`Сервер запущен на http://0.0.0.0:${port}/`);
    startCommandInput(); // Запускаем функцию для ввода команд
});

// Функция для отправки команды клиенту по серийному номеру
function sendCommand(serialNumber, command) {
    if (clients[serialNumber]) {
        clients[serialNumber].send(JSON.stringify({ command }));
        console.log(`[${new Date().toISOString()}] Команда ${command} отправлена клиенту с серийным номером ${serialNumber}`);
        
        // Логгируем команды START_AUDIO и STOP_AUDIO
        if (command === "START_AUDIO") {
            console.log(`[${new Date().toISOString()}] Запущена запись аудио для серийного номера: ${serialNumber}`);
        } else if (command === "STOP_AUDIO") {
            console.log(`[${new Date().toISOString()}] Остановлена запись аудио для серийного номера: ${serialNumber}`);
        }
    } else {
        console.log(`Клиент с серийным номером ${serialNumber} не подключен`);
    }
}

// Функция для чтения команд из терминала
function startCommandInput() {
    const rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout
    });

    rl.on('line', (input) => {
        const parts = input.trim().split(' ');
        
        if (parts.length === 2) {
            const command = parts[0].toUpperCase(); // Приводим команду к верхнему регистру
            const serialNumber = parts[1];

            if (command === 'START') {
                sendCommand(serialNumber, 'START_AUDIO');
            } else if (command === 'STOP') {
                sendCommand(serialNumber, 'STOP_AUDIO');
            } else {
                console.log('Неизвестная команда. Используйте START или STOP.');
            }
        } else {
            console.log('Неправильный формат команды. Используйте "START <серийник>" или "STOP <серийник>".');
        }
    });
}
