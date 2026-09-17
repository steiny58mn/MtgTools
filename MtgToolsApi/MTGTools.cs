using System.Text;
using Microsoft.AspNetCore.Mvc;
using MtgToolsApi.BusinessLayer;
using MtgToolsApi.DataRepository;
using MtgToolsApi.Utilities;

namespace MtgToolsApi;

[ApiController]
public class MtgTools
{
    public MtgTools()
    {
        Logging.ApiLogger.InitiateLogger();
    }

    public IResult Status()
    {
        var version = typeof(Program).Assembly.GetName().Version?.ToString(3) ?? "1.0.0";
        return Results.Json(new
        {
            success = true,
            message = "MTG Tools API is online and operational",
            version,
            timestampUtc = DateTime.UtcNow
        });
    }

    public string[] DeckColors()
    {
        return Colors.ColorList().Select(x => x.ColorName).OrderBy(x => x).ToArray();
    }

    public string GetBbCode(string color, int bbCodeType)
    {
        return ThreadBbCode.GetBbCode(color, bbCodeType);
    }

    public string FormatText(Text formatter)
    {
        return TextHelpers.FormatText(formatter);
    }

    public async Task<IResult> CreateDecklist([FromForm] IFormFileCollection files)
    {
        var combinedLists = new StringBuilder();

        foreach (var file in files)
        {
            var result = await Decklists.CreateDecklist(file);
            combinedLists.AppendLine(result);
            combinedLists.AppendLine();
        }

        return Results.File(Encoding.UTF8.GetBytes(combinedLists.ToString()), "text/plain");
    }

    public async Task<IResult> CompareFiles([FromForm] IFormFileCollection files)
    {
        if (files.Count == 2)
        {
            var firstFile = files[0];
            var secondFile = files[1];
            var diff = await Decklists.CompareDecklists(firstFile, secondFile);
            return Results.File(Encoding.UTF8.GetBytes(diff), "text/plain");
        }

        return Results.Json(new
        {
            success = false,
            fileInfo = "Compare Decks Failed - exactly two files are required"
        });
    }

    public IResult ParseMtgoLog([FromForm] IFormFileCollection files)
    {
        if (files.Count == 0)
        {
            return Results.Json(new { success = false, message = "No file provided" });
        }
        var parsedLog = MtgoLogParser.ParseMtgoGameLog(files[0]);
        return Results.File(Encoding.UTF8.GetBytes(parsedLog), "text/plain");
    }

    public async Task<IResult> CreateDeckPicklist([FromForm] IFormFileCollection files)
    {
        if (files.Count == 0)
        {
            return Results.Json(new { success = false, message = "No file provided" });
        }
        var picklist = await Decklists.CreateDeckPicklist(files[0]);
        return Results.File(Encoding.UTF8.GetBytes(picklist), "text/plain");
    }

    public IResult Test([FromBody] ViewModels.Models.TestModel model)
    {
        if (model.TestId == 58)
        {
            return Results.Json(new
            {
                success = true,
                message = model.TestString
            });
        }
        
        return Results.Json(new
        {
            success = false
        });
    }

    public async Task<string> PopulateCardDbFromJsonFile([FromForm] IFormFileCollection files)
    {
        if (files.Count > 0)
        {
            await DataLayer.TursoCardDb.PopulateCardDbFromJsonFile(files[0]);
            return "Population Successful";
        }
        return "No file provided";
    }
}
