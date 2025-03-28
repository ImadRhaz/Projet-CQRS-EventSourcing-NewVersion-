using RabbitMQ.Client;
using RabbitMQ.Client.Events;
using System.Text;
using Newtonsoft.Json;
using GestionFM1.Write.Commands;
using Microsoft.Extensions.DependencyInjection;
using GestionFM1.Infrastructure.Configuration;
using Microsoft.Extensions.Options;
using System;
using System.Threading;
using System.Threading.Tasks;
using Microsoft.Extensions.Logging;
using GestionFM1.Core.Interfaces;
using Microsoft.Extensions.Hosting;

namespace GestionFM1.Write.CommandConsumer
{
    public class AddComposentCommandConsumer : IHostedService, IDisposable
    {
        private readonly IConnection _connection;
        private readonly IModel _channel;
        private readonly string _queueName = "gestionfm1.composent.commands";
        private readonly IServiceProvider _serviceProvider;
        private readonly ILogger<AddComposentCommandConsumer> _logger;
        private bool _disposed = false;

        public AddComposentCommandConsumer(
            IOptions<RabbitMqConfiguration> rabbitMqConfiguration,
            IServiceProvider serviceProvider,
            ILogger<AddComposentCommandConsumer> logger)
        {
            _serviceProvider = serviceProvider;
            _logger = logger;

            var factory = new ConnectionFactory()
            {
                HostName = rabbitMqConfiguration.Value.HostName,
                UserName = rabbitMqConfiguration.Value.UserName,
                Password = rabbitMqConfiguration.Value.Password
            };

            try
            {
                _connection = factory.CreateConnection();
                _channel = _connection.CreateModel();
                _channel.QueueDeclare(queue: _queueName, durable: true, exclusive: false, autoDelete: false, arguments: null);
                _logger.LogInformation("RabbitMQ connection and channel created successfully.");
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error creating RabbitMQ connection or channel.");
                throw;
            }
        }

        public Task StartAsync(CancellationToken cancellationToken)
        {
            _logger.LogInformation("AddComposentCommandConsumer starting");
            Consume(); // Start consuming messages
            return Task.CompletedTask;
        }

        public Task StopAsync(CancellationToken cancellationToken)
        {
            _logger.LogInformation("AddComposentCommandConsumer stopping");
            Dispose(); // Clean up resources
            return Task.CompletedTask;
        }

        private void Consume()
        {
            var consumer = new EventingBasicConsumer(_channel);
            consumer.Received += async (model, ea) =>
            {
                var body = ea.Body.ToArray();
                var message = Encoding.UTF8.GetString(body);

                try
                {
                    _logger.LogInformation($"Received message: {message}");
                    _logger.LogDebug("Attempting to deserialize message to AddComposentCommand.");
                    var command = JsonConvert.DeserializeObject<AddComposentCommand>(message);

                    if (command == null)
                    {
                        _logger.LogError("Failed to deserialize message to AddComposentCommand.");
                        _channel.BasicNack(deliveryTag: ea.DeliveryTag, multiple: false, requeue: false);
                        return;
                    }
                    _logger.LogDebug($"Message deserialized successfully: {JsonConvert.SerializeObject(command)}");

                    // Résoudre le AddComposentCommandHandler à partir du conteneur DI
                    using (var scope = _serviceProvider.CreateScope())
                    {
                        _logger.LogDebug("Creating scope for resolving dependencies.");
                        var addComposentCommandHandler = scope.ServiceProvider.GetRequiredService<ICommandHandler<AddComposentCommand>>();

                        if (addComposentCommandHandler == null)
                        {
                            _logger.LogError("Failed to resolve ICommandHandler<AddComposentCommand> from DI container.");
                            _channel.BasicNack(deliveryTag: ea.DeliveryTag, multiple: false, requeue: false);
                            return;
                        }
                        _logger.LogDebug("ICommandHandler<AddComposentCommand> resolved successfully.");

                        _logger.LogDebug($"Handling command: {JsonConvert.SerializeObject(command)}");
                        await addComposentCommandHandler.Handle(command);
                        _logger.LogDebug("Command handled successfully.");
                    }

                    _channel.BasicAck(deliveryTag: ea.DeliveryTag, multiple: false); // Acknowledge the message
                    _logger.LogInformation($"Successfully processed message.");
                }
                catch (JsonException ex)
                {
                    _logger.LogError(ex, $"JSON deserialization error for message: {message}");
                    _channel.BasicNack(deliveryTag: ea.DeliveryTag, multiple: false, requeue: false);
                }
                catch (Exception ex)
                {
                    _logger.LogError(ex, $"Error processing message: {message}");
                    _channel.BasicNack(deliveryTag: ea.DeliveryTag, multiple: false, requeue: false); // Nack the message and don't requeue
                }
            };

            _channel.BasicConsume(queue: _queueName, autoAck: false, consumer: consumer); // autoAck: false => on doit envoyer un ACK manuellement
            _logger.LogInformation("Listening for messages...");
        }

        public void Dispose()
        {
            Dispose(true);
            GC.SuppressFinalize(this);
        }

        protected virtual void Dispose(bool disposing)
        {
            if (_disposed) return;

            if (disposing)
            {
                try
                {
                    if (_channel != null && _channel.IsOpen)
                    {
                        _channel.Close();
                        _logger.LogInformation("RabbitMQ channel closed.");
                    }
                    if (_connection != null && _connection.IsOpen)
                    {
                        _connection.Close();
                        _logger.LogInformation("RabbitMQ connection closed.");
                    }
                }
                catch (Exception ex)
                {
                    _logger.LogError(ex, "Error closing RabbitMQ connection or channel.");
                }
            }
            _disposed = true;
        }
    }
}