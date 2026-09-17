using Microsoft.AspNetCore.Http.Features;
using Microsoft.AspNetCore.Server.Kestrel.Core;

namespace MtgToolsApi;

public class Program
{
    public static void Main(string[] args)
    {
        var builder = WebApplication.CreateBuilder(args);
        builder.Logging.ClearProviders();
        builder.Logging.AddConsole();
        builder.Logging.AddAzureWebAppDiagnostics();
        var allowedOrigins = new [] {"https://mtgtools.azurewebsites.net", "https://mtgtools.frostpointlabs.com", "http://localhost:5173"};
        var mtgTools = new MtgTools();
        
        // Add services to the container.
        builder.Services.AddAuthorization();
        builder.Services.AddOpenApi();
        
        //Add Cors to ensure the React App can access the API
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
            x.MultipartBodyLengthLimit = int.MaxValue; // if don't set default value is: 128 MB
            x.MultipartHeadersLengthLimit = int.MaxValue;
        });
        
        builder.Logging.AddAzureWebAppDiagnostics();
        
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
        app.MapGet("/mtgtools/deckcolors", mtgTools.DeckColors);
        app.MapGet("/mtgtools/getbbcode", mtgTools.GetBbCode);
        app.MapPost("/mtgtools/formattext", mtgTools.FormatText);
        app.MapPost("/mtgtools/createdecklist", mtgTools.CreateDecklist).DisableAntiforgery();
        app.MapPost("/mtgtools/updatedb", mtgTools.PopulateCardDbFromJsonFile).DisableAntiforgery();
        app.MapPost("/mtgtools/comparefiles", mtgTools.CompareFiles).DisableAntiforgery();
        app.MapPost("/mtgtools/test", mtgTools.Test);
        app.MapPost("/mtgtools/parsemtgolog", mtgTools.ParseMtgoLog).DisableAntiforgery();
        app.MapPost("/mtgtools/createdeckpicklist", mtgTools.CreateDeckPicklist).DisableAntiforgery();
        app.Run();
    }
}