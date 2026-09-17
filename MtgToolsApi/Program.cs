using Microsoft.AspNetCore.Http.Features;
using Microsoft.AspNetCore.Server.Kestrel.Core;
using MtgToolsApi.DataLayer;

namespace MtgToolsApi;

public class Program
{
    public static void Main(string[] args)
    {
        var builder = WebApplication.CreateBuilder(args);
        builder.Logging.ClearProviders();
        builder.Logging.AddConsole();
        builder.Logging.AddAzureWebAppDiagnostics();

        // Configure Turso credentials from Configuration if provided
        var tursoUrl = builder.Configuration["Turso:DbUrl"];
        var tursoToken = builder.Configuration["Turso:DbToken"];
        TursoCardDb.Configure(tursoUrl, tursoToken);

        var allowedOrigins = new[]
        {
            "https://mtgtools.azurewebsites.net",
            "https://mtgtools.frostpointlabs.com",
            "http://localhost:5173",
            "http://localhost:3000"
        };
        
        var mtgTools = new MtgTools();
        
        // Add services to the container.
        builder.Services.AddAuthorization();
        builder.Services.AddOpenApi();
        builder.Services.AddHttpClient();
        
        // Add CORS to ensure the React App can access the API
        builder.Services.AddCors(setup =>
        {
            setup.AddDefaultPolicy(policy =>
            { 
                policy.WithOrigins(allowedOrigins)
                    .AllowAnyHeader()
                    .AllowAnyMethod()
                    .AllowCredentials();
            });
        });
        
        #if WINDOWS
        builder.Services.Configure<IISServerOptions>(options =>
        {
            options.AllowSynchronousIO = true;
            options.MaxRequestBodySize = int.MaxValue;
        });
        #endif
        
        builder.Services.Configure<KestrelServerOptions>(options =>
        {
            options.AllowSynchronousIO = true;
            options.Limits.MaxRequestBodySize = int.MaxValue;
        });

        builder.Services.Configure<FormOptions>(x =>
        {
            x.ValueLengthLimit = int.MaxValue;
            x.MultipartBodyLengthLimit = int.MaxValue;
            x.MultipartHeadersLengthLimit = int.MaxValue;
        });
        
        var app = builder.Build();

        // Configure the HTTP request pipeline.
        if (app.Environment.IsDevelopment())
        {
            app.MapOpenApi();
        }

        app.UseHttpsRedirection();
        app.UseRouting();
        app.UseCors();
        app.UseAuthorization();
        app.UseDeveloperExceptionPage();

        // Health and Status endpoints for direct browser access
        app.MapGet("/", mtgTools.Status);
        
        // Group MTG endpoints
        var mtgGroup = app.MapGroup("/mtgtools");
        
        mtgGroup.MapGet("/status", mtgTools.Status);
        mtgGroup.MapGet("/version", mtgTools.Status);
        mtgGroup.MapGet("/health", mtgTools.Status);
        mtgGroup.MapGet("/deckcolors", mtgTools.DeckColors);
        mtgGroup.MapGet("/getbbcode", mtgTools.GetBbCode);
        mtgGroup.MapPost("/formattext", mtgTools.FormatText);
        mtgGroup.MapPost("/createdecklist", mtgTools.CreateDecklist).DisableAntiforgery();
        mtgGroup.MapPost("/updatedb", mtgTools.PopulateCardDbFromJsonFile).DisableAntiforgery();
        mtgGroup.MapPost("/comparefiles", mtgTools.CompareFiles).DisableAntiforgery();
        mtgGroup.MapPost("/test", mtgTools.Test);
        mtgGroup.MapPost("/parsemtgolog", mtgTools.ParseMtgoLog).DisableAntiforgery();
        mtgGroup.MapPost("/createdeckpicklist", mtgTools.CreateDeckPicklist).DisableAntiforgery();

        app.Run();
    }
}
