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
    public IResult CreateDecklist([FromForm] IFormFileCollection files)
    {
        var combinedLists = new StringBuilder();

         files.ToList().ForEach(file =>
         {
             combinedLists.AppendLine(Decklists.CreateDecklist(file).Result);
             combinedLists.AppendLine();
         });
        //return Results.Json(new {success=true, content=combinedLists.ToString()});
        return Results.File(Encoding.UTF8.GetBytes(combinedLists.ToString()), "application/txt");
    }
    public IResult CompareFiles([FromForm] IFormFileCollection files)
    {
        if (files.Count == 2)
        {
            IFormFile firstFile = files[0];
            IFormFile secondFile = files[1];
            return Results.File(Encoding.UTF8.GetBytes(Decklists.CompareDecklists(firstFile, secondFile).Result), "application/txt");
        }
        return Results.Json(new {
            success = false, fileInfo = "Compare Decks Failed"
        });
    }
    public IResult ParseMtgoLog([FromForm] IFormFileCollection files)
    {
        return Results.File(Encoding.UTF8.GetBytes(MtgoLogParser.ParseMtgoGameLog(files[0])), "application/txt");
    }
    public IResult CreateDeckPicklist([FromForm] IFormFileCollection files)
    {
        return Results.File(Encoding.UTF8.GetBytes(Decklists.CreateDeckPicklist(files[0]).Result), "application/txt");
    }
    public IResult Test([FromBody] ViewModels.Models.TestModel model)
    {
        if (model.TestId == 58)
        {
            return Results.Json(new {
                success = true, message = model.TestString
            });    
        }
        else
        {
            return Results.Json(new {
                success = false
            });
        }
    }
    public string PopulateCardDbFromJsonFile([FromForm] IFormFileCollection files)
    {
        DataLayer.TursoCardDb.PopulateCardDbFromJsonFile(files[0]);
        return "Population Successful";
    }
}