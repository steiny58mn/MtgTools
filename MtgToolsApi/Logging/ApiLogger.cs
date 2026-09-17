using MtgToolsApi.DataLayer;

namespace MtgToolsApi.Logging;

public static class ApiLogger
{
    private static ILogger? _apiLogger;
    public static void InitiateLogger()
    {
        using ILoggerFactory factory = LoggerFactory.Create(builder =>
        {
            builder.AddConsole();
            builder.AddAzureWebAppDiagnostics();
        });
        
        _apiLogger = factory.CreateLogger("MTGToolsLogger");
    }
    public static async Task LogMessage(string message)
    {
        if (_apiLogger == null)
        {
            InitiateLogger();
            _apiLogger?.LogInformation(message);
        }
        else
        {
            _apiLogger.LogInformation(message);
        }
        await LogMessageToDb(message);
    }

    private static async Task LogMessageToDb(string message)
    {
        await TursoCardDb.LogMessage(message);
    }
}